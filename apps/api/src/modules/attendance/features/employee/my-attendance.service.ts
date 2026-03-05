import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, desc, asc, gte, lte, sql, between, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyAttendanceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Calendar View ─────────────────────────────────────────────────────
  async getCalendar(orgId: string, userId: string, month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get attendance records for the month
    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      )
      .orderBy(asc(schema.attendanceRecords.date));

    // Get holidays for the month
    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, startDate),
          lte(schema.holidayCalendars.date, endDate),
        ),
      );

    // Get org config for work week
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const weekendDays: number[] = [];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    dayNames.forEach((day, index) => {
      if (workWeek[day] === 'off' || workWeek[day] === false) {
        weekendDays.push(index);
      }
    });

    // Build calendar
    const recordMap = new Map(records.map((r) => [r.date, r]));
    const holidayMap = new Map(holidays.map((h) => [h.date, h]));

    const calendar: Record<string, any>[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const record = recordMap.get(dateStr);
      const holiday = holidayMap.get(dateStr);

      let status: string;
      if (holiday) {
        status = 'holiday';
      } else if (weekendDays.includes(dayOfWeek)) {
        status = 'weekend';
      } else if (record) {
        status = record.status || 'present';
      } else {
        // If the day is in the past and no record, it's absent
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) {
          status = 'absent';
        } else {
          status = 'upcoming';
        }
      }

      calendar.push({
        date: dateStr,
        dayOfWeek,
        status,
        clockIn: record?.clockIn?.toISOString() || null,
        clockOut: record?.clockOut?.toISOString() || null,
        totalWorkMinutes: record?.totalWorkMinutes || 0,
        overtimeMinutes: record?.overtimeMinutes || 0,
        lateMinutes: record?.lateMinutes || 0,
        earlyDepartureMinutes: record?.earlyDepartureMinutes || 0,
        isHalfDay: record?.isHalfDay || false,
        holidayName: holiday?.name || null,
        holidayType: holiday?.type || null,
      });
    }

    return { month, year, calendar };
  }

  // ── Daily Detail ──────────────────────────────────────────────────────
  async getDailyDetail(orgId: string, userId: string, date: string) {
    const [record] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          eq(schema.attendanceRecords.date, date),
        ),
      )
      .limit(1);

    if (!record) {
      return {
        date,
        status: 'no_record',
        clockIn: null,
        clockOut: null,
        breaks: [],
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        shiftId: null,
      };
    }

    // Get breaks
    const breaks = await this.db
      .select()
      .from(schema.attendanceBreaks)
      .where(eq(schema.attendanceBreaks.attendanceRecordId, record.id))
      .orderBy(asc(schema.attendanceBreaks.startTime));

    // Get shift info
    let shiftName: string | null = null;
    if (record.shiftId) {
      const [shift] = await this.db
        .select({ name: schema.shifts.name })
        .from(schema.shifts)
        .where(eq(schema.shifts.id, record.shiftId))
        .limit(1);
      shiftName = shift?.name || null;
    }

    return {
      date: record.date,
      status: record.status,
      clockIn: record.clockIn?.toISOString() || null,
      clockOut: record.clockOut?.toISOString() || null,
      clockInMethod: record.clockInMethod,
      clockOutMethod: record.clockOutMethod,
      clockInLocation: record.clockInLocation,
      clockOutLocation: record.clockOutLocation,
      totalWorkMinutes: record.totalWorkMinutes || 0,
      totalBreakMinutes: record.totalBreakMinutes || 0,
      overtimeMinutes: record.overtimeMinutes || 0,
      lateMinutes: record.lateMinutes || 0,
      earlyDepartureMinutes: record.earlyDepartureMinutes || 0,
      isHalfDay: record.isHalfDay,
      isOvertime: record.isOvertime,
      isRegularized: record.isRegularized,
      shiftId: record.shiftId,
      shiftName,
      remarks: record.remarks,
      breaks: breaks.map((b) => ({
        id: b.id,
        breakType: b.breakType,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime?.toISOString() || null,
        durationMinutes: b.durationMinutes || 0,
      })),
    };
  }

  // ── Monthly Summary ───────────────────────────────────────────────────
  async getMonthlySummary(orgId: string, userId: string, month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, startDate),
          lte(schema.holidayCalendars.date, endDate),
        ),
      );

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let lateDays = 0;
    let earlyDepartures = 0;
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalLateMinutes = 0;
    let wfhDays = 0;

    for (const r of records) {
      if (r.status === 'present' || r.status === 'late' || r.status === 'wfh') {
        presentDays++;
      }
      if (r.status === 'half_day') {
        halfDays++;
      }
      if (r.status === 'wfh') {
        wfhDays++;
      }
      if (r.lateMinutes && r.lateMinutes > 0) {
        lateDays++;
        totalLateMinutes += r.lateMinutes;
      }
      if (r.earlyDepartureMinutes && r.earlyDepartureMinutes > 0) {
        earlyDepartures++;
      }
      totalWorkMinutes += r.totalWorkMinutes || 0;
      totalOvertimeMinutes += r.overtimeMinutes || 0;
    }

    // Calculate working days (non-weekend, non-holiday) in the month
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekendDays: number[] = [];
    dayNames.forEach((day, index) => {
      if (workWeek[day] === 'off' || workWeek[day] === false) {
        weekendDays.push(index);
      }
    });

    const holidayDates = new Set(holidays.map((h) => h.date));
    let totalWorkingDays = 0;
    const today = new Date();

    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, day);
      if (dateObj > today) break; // Don't count future days
      if (weekendDays.includes(dateObj.getDay())) continue;
      if (holidayDates.has(dateStr)) continue;
      totalWorkingDays++;
    }

    absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays);

    const avgWorkHoursPerDay = presentDays > 0
      ? Math.round((totalWorkMinutes / presentDays / 60) * 10) / 10
      : 0;

    return {
      month,
      year,
      totalWorkingDays,
      presentDays,
      absentDays,
      halfDays,
      lateDays,
      earlyDepartures,
      wfhDays,
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
      totalLateMinutes,
      avgWorkHoursPerDay,
      holidayCount: holidays.length,
    };
  }

  // ── Year-to-Date Stats ────────────────────────────────────────────────
  async getYtdStats(orgId: string, userId: string) {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const todayStr = now.toISOString().slice(0, 10);

    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, yearStart),
          lte(schema.attendanceRecords.date, todayStr),
        ),
      );

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let earlyDepartures = 0;
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    let halfDays = 0;

    for (const r of records) {
      if (r.status === 'present' || r.status === 'late' || r.status === 'wfh') {
        presentDays++;
      }
      if (r.status === 'half_day') halfDays++;
      if (r.lateMinutes && r.lateMinutes > 0) lateDays++;
      if (r.earlyDepartureMinutes && r.earlyDepartureMinutes > 0) earlyDepartures++;
      totalWorkMinutes += r.totalWorkMinutes || 0;
      totalOvertimeMinutes += r.overtimeMinutes || 0;
    }

    // Count holidays YTD
    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, yearStart),
          lte(schema.holidayCalendars.date, todayStr),
        ),
      );

    // Calculate total working days YTD
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekendDays: number[] = [];
    dayNames.forEach((day, index) => {
      if (workWeek[day] === 'off' || workWeek[day] === false) {
        weekendDays.push(index);
      }
    });

    const holidayDates = new Set(holidays.map((h) => h.date));
    let totalWorkingDays = 0;
    const cursor = new Date(now.getFullYear(), 0, 1);
    while (cursor <= now) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!weekendDays.includes(cursor.getDay()) && !holidayDates.has(dateStr)) {
        totalWorkingDays++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    absentDays = Math.max(0, totalWorkingDays - presentDays - halfDays);

    const avgWorkHoursPerDay = presentDays > 0
      ? Math.round((totalWorkMinutes / presentDays / 60) * 10) / 10
      : 0;

    return {
      year: now.getFullYear(),
      totalWorkingDays,
      presentDays,
      absentDays,
      halfDays,
      lateDays,
      earlyDepartures,
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
      avgWorkHoursPerDay,
      holidayCount: holidays.length,
    };
  }

  // ── Trends ────────────────────────────────────────────────────────────
  async getTrends(orgId: string, userId: string, months: number) {
    const now = new Date();
    const trends: Record<string, any>[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetDate.getMonth() + 1;
      const y = targetDate.getFullYear();

      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const records = await this.db
        .select()
        .from(schema.attendanceRecords)
        .where(
          and(
            eq(schema.attendanceRecords.orgId, orgId),
            eq(schema.attendanceRecords.employeeId, userId),
            gte(schema.attendanceRecords.date, startDate),
            lte(schema.attendanceRecords.date, endDate),
          ),
        );

      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let totalWorkMinutes = 0;
      let totalOvertimeMinutes = 0;

      for (const r of records) {
        if (r.status === 'present' || r.status === 'late' || r.status === 'wfh') {
          presentDays++;
        }
        if (r.lateMinutes && r.lateMinutes > 0) lateDays++;
        totalWorkMinutes += r.totalWorkMinutes || 0;
        totalOvertimeMinutes += r.overtimeMinutes || 0;
      }

      // Simple absent estimate: working days minus present
      absentDays = Math.max(0, 22 - presentDays); // rough working days

      const avgWorkHours = presentDays > 0
        ? Math.round((totalWorkMinutes / presentDays / 60) * 10) / 10
        : 0;

      trends.push({
        month: `${y}-${String(m).padStart(2, '0')}`,
        monthName: targetDate.toLocaleString('default', { month: 'long' }),
        year: y,
        presentDays,
        absentDays,
        lateDays,
        avgWorkHours,
        otHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
      });
    }

    return { trends };
  }

  // ── Today Status (detailed) ───────────────────────────────────────────
  async getToday(orgId: string, userId: string) {
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

    // Get shift info
    let shiftInfo: Record<string, any> | null = null;
    if (record?.shiftId) {
      const [shift] = await this.db
        .select()
        .from(schema.shifts)
        .where(eq(schema.shifts.id, record.shiftId))
        .limit(1);
      if (shift) {
        shiftInfo = {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          minWorkHours: shift.minWorkHours,
        };
      }
    }

    if (!record) {
      return {
        date: todayStr,
        isClockedIn: false,
        clockIn: null,
        clockOut: null,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        status: 'not_started',
        shift: shiftInfo,
        isOnBreak: false,
      };
    }

    // Real-time calculation of worked minutes
    let totalWorkedMinutes = 0;
    if (record.clockIn) {
      const endTime = record.clockOut || now;
      totalWorkedMinutes = Math.round((endTime.getTime() - record.clockIn.getTime()) / 60000);
      totalWorkedMinutes = Math.max(0, totalWorkedMinutes - (record.totalBreakMinutes || 0));
    }

    // Check active break
    let isOnBreak = false;
    if (record.clockIn && !record.clockOut) {
      const [activeBreak] = await this.db
        .select()
        .from(schema.attendanceBreaks)
        .where(
          and(
            eq(schema.attendanceBreaks.attendanceRecordId, record.id),
            sql`${schema.attendanceBreaks.endTime} IS NULL`,
          ),
        )
        .limit(1);

      if (activeBreak) {
        isOnBreak = true;
        const breakSoFar = Math.round((now.getTime() - activeBreak.startTime.getTime()) / 60000);
        totalWorkedMinutes = Math.max(0, totalWorkedMinutes - breakSoFar);
      }
    }

    return {
      date: todayStr,
      isClockedIn: !!record.clockIn && !record.clockOut,
      clockIn: record.clockIn?.toISOString() || null,
      clockOut: record.clockOut?.toISOString() || null,
      totalWorkedMinutes,
      totalBreakMinutes: record.totalBreakMinutes || 0,
      overtimeMinutes: record.overtimeMinutes || 0,
      lateMinutes: record.lateMinutes || 0,
      earlyDepartureMinutes: record.earlyDepartureMinutes || 0,
      status: record.status,
      shift: shiftInfo,
      isOnBreak,
    };
  }
}
