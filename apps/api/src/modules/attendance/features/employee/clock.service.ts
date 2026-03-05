import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ClockService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Clock In ──────────────────────────────────────────────────────────
  async clockIn(orgId: string, userId: string, data: Record<string, any>) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Check if already clocked in today
    const [existing] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          eq(schema.attendanceRecords.date, todayStr),
        ),
      )
      .limit(1);

    if (existing?.clockIn && !existing?.clockOut) {
      throw new BadRequestException('Already clocked in. Please clock out first.');
    }

    if (existing?.clockIn && existing?.clockOut) {
      throw new BadRequestException('Already completed attendance for today.');
    }

    // Get the employee's current shift
    const shift = await this.getEmployeeShift(orgId, userId);

    // Calculate late minutes
    let lateMinutes = 0;
    let status = 'present';
    if (shift) {
      lateMinutes = this.calculateLateMinutes(now, shift.startTime, shift.graceMinutesLate);
      if (lateMinutes > 0) {
        status = 'late';
      }
    }

    const clockInLocation = data.location
      ? { latitude: data.location.latitude, longitude: data.location.longitude, accuracy: data.location.accuracy }
      : {};

    if (existing) {
      // Update existing record that has no clock-in
      const [updated] = await this.db
        .update(schema.attendanceRecords)
        .set({
          clockIn: now,
          clockInMethod: data.method || 'web',
          clockInLocation,
          clockInIp: data.ipAddress || null,
          clockInDeviceId: data.deviceId || null,
          shiftId: shift?.id || null,
          status,
          lateMinutes,
          remarks: data.remarks || null,
          updatedAt: now,
        })
        .where(eq(schema.attendanceRecords.id, existing.id))
        .returning();

      return this.toRecordDto(updated);
    }

    // Create new attendance record
    const [record] = await this.db
      .insert(schema.attendanceRecords)
      .values({
        orgId,
        employeeId: userId,
        date: todayStr,
        shiftId: shift?.id || null,
        clockIn: now,
        clockInMethod: data.method || 'web',
        clockInLocation,
        clockInIp: data.ipAddress || null,
        clockInDeviceId: data.deviceId || null,
        status,
        lateMinutes,
        remarks: data.remarks || null,
      })
      .returning();

    return this.toRecordDto(record);
  }

  // ── Clock Out ─────────────────────────────────────────────────────────
  async clockOut(orgId: string, userId: string, data: Record<string, any>) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const [record] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          eq(schema.attendanceRecords.date, todayStr),
        ),
      )
      .limit(1);

    if (!record) {
      throw new BadRequestException('No clock-in found for today. Please clock in first.');
    }

    if (!record.clockIn) {
      throw new BadRequestException('No clock-in found for today. Please clock in first.');
    }

    if (record.clockOut) {
      throw new BadRequestException('Already clocked out for today.');
    }

    // Get breaks for today
    const breaks = await this.db
      .select()
      .from(schema.attendanceBreaks)
      .where(eq(schema.attendanceBreaks.attendanceRecordId, record.id));

    // End any active break first
    const activeBreak = breaks.find((b) => !b.endTime);
    if (activeBreak) {
      const breakDuration = Math.round((now.getTime() - activeBreak.startTime.getTime()) / 60000);
      await this.db
        .update(schema.attendanceBreaks)
        .set({ endTime: now, durationMinutes: breakDuration, updatedAt: now })
        .where(eq(schema.attendanceBreaks.id, activeBreak.id));
    }

    // Calculate total break minutes
    let totalBreakMinutes = 0;
    for (const b of breaks) {
      if (b.endTime) {
        totalBreakMinutes += b.durationMinutes || 0;
      } else {
        // Active break being auto-closed
        totalBreakMinutes += Math.round((now.getTime() - b.startTime.getTime()) / 60000);
      }
    }

    // Calculate total work minutes (clock-in to clock-out minus breaks)
    const rawWorkMinutes = Math.round((now.getTime() - record.clockIn.getTime()) / 60000);
    const totalWorkMinutes = Math.max(0, rawWorkMinutes - totalBreakMinutes);

    // Get shift for overtime and early departure calculation
    const shift = await this.getEmployeeShift(orgId, userId);
    let overtimeMinutes = 0;
    let earlyDepartureMinutes = 0;
    let isOvertime = false;

    if (shift) {
      const minWorkMinutes = (shift.minWorkHours || 8) * 60;

      // Calculate overtime
      if (totalWorkMinutes > minWorkMinutes) {
        overtimeMinutes = totalWorkMinutes - minWorkMinutes;
        isOvertime = true;
      }

      // Calculate early departure
      earlyDepartureMinutes = this.calculateEarlyDeparture(now, shift.endTime, shift.graceMinutesEarly);
    }

    // Determine status
    let status = record.status || 'present';
    const shift2 = shift;
    if (shift2) {
      const halfDayThreshold = ((shift2.minWorkHours || 8) * 60) / 2;
      if (totalWorkMinutes < halfDayThreshold) {
        status = 'half_day';
      }
    }

    const clockOutLocation = data.location
      ? { latitude: data.location.latitude, longitude: data.location.longitude, accuracy: data.location.accuracy }
      : {};

    const [updated] = await this.db
      .update(schema.attendanceRecords)
      .set({
        clockOut: now,
        clockOutMethod: data.method || 'web',
        clockOutLocation,
        clockOutIp: data.ipAddress || null,
        clockOutDeviceId: data.deviceId || null,
        totalWorkMinutes,
        totalBreakMinutes,
        overtimeMinutes,
        earlyDepartureMinutes,
        isOvertime,
        isHalfDay: status === 'half_day',
        status,
        updatedAt: now,
      })
      .where(eq(schema.attendanceRecords.id, record.id))
      .returning();

    return this.toRecordDto(updated);
  }

  // ── Clock Status ──────────────────────────────────────────────────────
  async getStatus(orgId: string, userId: string) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const [record] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          eq(schema.attendanceRecords.date, todayStr),
        ),
      )
      .limit(1);

    // Get current shift
    const shift = await this.getEmployeeShift(orgId, userId);

    // Check for active break
    let currentBreak: Record<string, any> | null = null;
    let isOnBreak = false;

    if (record) {
      const [activeBreak] = await this.db
        .select()
        .from(schema.attendanceBreaks)
        .where(
          and(
            eq(schema.attendanceBreaks.attendanceRecordId, record.id),
            isNull(schema.attendanceBreaks.endTime),
          ),
        )
        .limit(1);

      if (activeBreak) {
        isOnBreak = true;
        currentBreak = {
          id: activeBreak.id,
          breakType: activeBreak.breakType,
          startTime: activeBreak.startTime.toISOString(),
          durationSoFar: Math.round((now.getTime() - activeBreak.startTime.getTime()) / 60000),
        };
      }
    }

    // Calculate total worked minutes in real time
    let totalWorkedMinutes = 0;
    if (record?.clockIn) {
      const endTime = record.clockOut || now;
      totalWorkedMinutes = Math.round((endTime.getTime() - record.clockIn.getTime()) / 60000);
      totalWorkedMinutes = Math.max(0, totalWorkedMinutes - (record.totalBreakMinutes || 0));
      if (isOnBreak && currentBreak) {
        totalWorkedMinutes = Math.max(0, totalWorkedMinutes - currentBreak.durationSoFar);
      }
    }

    return {
      isClockedIn: !!record?.clockIn && !record?.clockOut,
      clockInTime: record?.clockIn?.toISOString() || null,
      clockOutTime: record?.clockOut?.toISOString() || null,
      totalWorkedMinutes,
      currentBreak,
      isOnBreak,
      shiftName: shift?.name || null,
      shiftStart: shift?.startTime || null,
      shiftEnd: shift?.endTime || null,
      lateMinutes: record?.lateMinutes || 0,
      status: record?.status || null,
    };
  }

  // ── Start Break ───────────────────────────────────────────────────────
  async startBreak(orgId: string, userId: string, data: Record<string, any>) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const [record] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          eq(schema.attendanceRecords.date, todayStr),
        ),
      )
      .limit(1);

    if (!record || !record.clockIn) {
      throw new BadRequestException('You must clock in before starting a break.');
    }

    if (record.clockOut) {
      throw new BadRequestException('Cannot start break after clocking out.');
    }

    // Check if already on a break
    const [activeBreak] = await this.db
      .select()
      .from(schema.attendanceBreaks)
      .where(
        and(
          eq(schema.attendanceBreaks.attendanceRecordId, record.id),
          isNull(schema.attendanceBreaks.endTime),
        ),
      )
      .limit(1);

    if (activeBreak) {
      throw new BadRequestException('Already on a break. Please end the current break first.');
    }

    const breakType = data.breakType || 'general';

    const [created] = await this.db
      .insert(schema.attendanceBreaks)
      .values({
        orgId,
        attendanceRecordId: record.id,
        breakType,
        startTime: now,
      })
      .returning();

    return {
      id: created.id,
      attendanceRecordId: created.attendanceRecordId,
      breakType: created.breakType,
      startTime: created.startTime.toISOString(),
      endTime: null,
      durationMinutes: 0,
    };
  }

  // ── End Break ─────────────────────────────────────────────────────────
  async endBreak(orgId: string, userId: string) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const [record] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          eq(schema.attendanceRecords.date, todayStr),
        ),
      )
      .limit(1);

    if (!record) {
      throw new BadRequestException('No attendance record found for today.');
    }

    const [activeBreak] = await this.db
      .select()
      .from(schema.attendanceBreaks)
      .where(
        and(
          eq(schema.attendanceBreaks.attendanceRecordId, record.id),
          isNull(schema.attendanceBreaks.endTime),
        ),
      )
      .limit(1);

    if (!activeBreak) {
      throw new BadRequestException('No active break found.');
    }

    const durationMinutes = Math.round(
      (now.getTime() - activeBreak.startTime.getTime()) / 60000,
    );

    const [updated] = await this.db
      .update(schema.attendanceBreaks)
      .set({
        endTime: now,
        durationMinutes,
        updatedAt: now,
      })
      .where(eq(schema.attendanceBreaks.id, activeBreak.id))
      .returning();

    // Update total break minutes on attendance record
    const allBreaks = await this.db
      .select()
      .from(schema.attendanceBreaks)
      .where(eq(schema.attendanceBreaks.attendanceRecordId, record.id));

    let totalBreakMinutes = 0;
    for (const b of allBreaks) {
      totalBreakMinutes += b.durationMinutes || 0;
    }

    await this.db
      .update(schema.attendanceRecords)
      .set({ totalBreakMinutes, updatedAt: now })
      .where(eq(schema.attendanceRecords.id, record.id));

    return {
      id: updated.id,
      attendanceRecordId: updated.attendanceRecordId,
      breakType: updated.breakType,
      startTime: updated.startTime.toISOString(),
      endTime: updated.endTime?.toISOString() || null,
      durationMinutes: updated.durationMinutes,
      totalBreakMinutes,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Get the employee's currently assigned shift, or the org default shift */
  private async getEmployeeShift(orgId: string, userId: string) {
    // Try to find current assigned shift
    const [assignment] = await this.db
      .select()
      .from(schema.employeeShiftAssignments)
      .where(
        and(
          eq(schema.employeeShiftAssignments.orgId, orgId),
          eq(schema.employeeShiftAssignments.employeeId, userId),
          eq(schema.employeeShiftAssignments.isCurrent, true),
        ),
      )
      .limit(1);

    if (assignment) {
      const [shift] = await this.db
        .select()
        .from(schema.shifts)
        .where(
          and(
            eq(schema.shifts.id, assignment.shiftId),
            eq(schema.shifts.orgId, orgId),
            eq(schema.shifts.isActive, true),
          ),
        )
        .limit(1);

      if (shift) return shift;
    }

    // Fall back to org default shift
    const [defaultShift] = await this.db
      .select()
      .from(schema.shifts)
      .where(
        and(
          eq(schema.shifts.orgId, orgId),
          eq(schema.shifts.isDefault, true),
          eq(schema.shifts.isActive, true),
        ),
      )
      .limit(1);

    return defaultShift || null;
  }

  /** Calculate late minutes: compare clock-in time with shift start + grace */
  private calculateLateMinutes(
    clockInTime: Date,
    shiftStartTime: string, // e.g. "09:00"
    graceMinutesLate: number,
  ): number {
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    const shiftStart = new Date(clockInTime);
    shiftStart.setHours(hours, minutes, 0, 0);

    // Add grace period
    const graceDeadline = new Date(shiftStart.getTime() + graceMinutesLate * 60000);

    if (clockInTime > graceDeadline) {
      return Math.round((clockInTime.getTime() - shiftStart.getTime()) / 60000);
    }

    return 0;
  }

  /** Calculate early departure minutes */
  private calculateEarlyDeparture(
    clockOutTime: Date,
    shiftEndTime: string, // e.g. "18:00"
    graceMinutesEarly: number,
  ): number {
    const [hours, minutes] = shiftEndTime.split(':').map(Number);
    const shiftEnd = new Date(clockOutTime);
    shiftEnd.setHours(hours, minutes, 0, 0);

    // Subtract grace period
    const earlyThreshold = new Date(shiftEnd.getTime() - graceMinutesEarly * 60000);

    if (clockOutTime < earlyThreshold) {
      return Math.round((shiftEnd.getTime() - clockOutTime.getTime()) / 60000);
    }

    return 0;
  }

  private toRecordDto(row: typeof schema.attendanceRecords.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      date: row.date,
      shiftId: row.shiftId,
      clockIn: row.clockIn?.toISOString() || null,
      clockOut: row.clockOut?.toISOString() || null,
      clockInMethod: row.clockInMethod,
      clockOutMethod: row.clockOutMethod,
      clockInLocation: row.clockInLocation,
      clockOutLocation: row.clockOutLocation,
      clockInIp: row.clockInIp,
      clockOutIp: row.clockOutIp,
      status: row.status,
      lateMinutes: row.lateMinutes,
      earlyDepartureMinutes: row.earlyDepartureMinutes,
      totalWorkMinutes: row.totalWorkMinutes,
      totalBreakMinutes: row.totalBreakMinutes,
      overtimeMinutes: row.overtimeMinutes,
      isHalfDay: row.isHalfDay,
      isOvertime: row.isOvertime,
      isRegularized: row.isRegularized,
      remarks: row.remarks,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
