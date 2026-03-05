import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CompoffMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── List Comp-Offs ──────────────────────────────────────────────────────
  async getCompOffs(orgId: string, userId: string, status?: string) {
    const conditions: any[] = [
      eq(schema.compOffRecords.orgId, orgId),
      eq(schema.compOffRecords.employeeId, userId),
    ];

    if (status) {
      conditions.push(eq(schema.compOffRecords.status, status));
    }

    const records = await this.db
      .select()
      .from(schema.compOffRecords)
      .where(and(...conditions))
      .orderBy(desc(schema.compOffRecords.earnedDate));

    return {
      data: records.map((r) => ({
        id: r.id,
        earnedDate: r.earnedDate,
        reason: r.reason,
        workType: r.workType,
        daysEarned: Number(r.daysEarned),
        daysUsed: Number(r.daysUsed),
        daysAvailable: Number(r.daysAvailable),
        expiryDate: r.expiryDate,
        status: r.status,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt?.toISOString() || null,
        linkedLeaveRequestId: r.linkedLeaveRequestId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: records.length,
    };
  }

  // ── Claim Comp-Off ──────────────────────────────────────────────────────
  async claimCompOff(orgId: string, userId: string, data: Record<string, any>) {
    const { earnedDate, reason, workType } = data;

    if (!earnedDate || !reason || !workType) {
      throw new BadRequestException('earnedDate, reason, and workType are required');
    }

    // Validate the earned date is not in the future
    if (new Date(earnedDate) > new Date()) {
      throw new BadRequestException('Earned date cannot be in the future');
    }

    // Check if attendance confirms working on that date
    const [attendance] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          eq(schema.attendanceRecords.date, earnedDate),
        ),
      )
      .limit(1);

    // If there's no attendance record, still allow the claim (it could be approved later)
    // but flag it in metadata
    const hasAttendance = !!attendance;

    // Check if comp-off already claimed for this date
    const [existing] = await this.db
      .select()
      .from(schema.compOffRecords)
      .where(
        and(
          eq(schema.compOffRecords.orgId, orgId),
          eq(schema.compOffRecords.employeeId, userId),
          eq(schema.compOffRecords.earnedDate, earnedDate),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('Comp-off already claimed for this date');
    }

    // Get policy for comp-off rules
    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
          eq(schema.leavePolicies.isActive, true),
        ),
      )
      .limit(1);

    // Calculate expiry date
    const expiryDays = policy?.compOffExpiryDays || 90;
    const expiryDate = new Date(earnedDate);
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Determine days earned based on work type
    let daysEarned = 1;
    const earningRules = policy?.compOffEarningRules as any;
    if (earningRules && typeof earningRules === 'object') {
      if (workType === 'half_day') {
        daysEarned = earningRules.halfDayEarning || 0.5;
      } else if (workType === 'full_day') {
        daysEarned = earningRules.fullDayEarning || 1;
      } else if (workType === 'holiday') {
        daysEarned = earningRules.holidayEarning || 1.5;
      }
    }

    const [record] = await this.db
      .insert(schema.compOffRecords)
      .values({
        orgId,
        employeeId: userId,
        earnedDate,
        reason,
        workType,
        daysEarned: daysEarned.toString(),
        daysUsed: '0',
        daysAvailable: daysEarned.toString(),
        expiryDate: expiryDate.toISOString().slice(0, 10),
        status: 'active',
        metadata: { hasAttendanceRecord: hasAttendance },
      })
      .returning();

    return {
      id: record.id,
      earnedDate: record.earnedDate,
      reason: record.reason,
      workType: record.workType,
      daysEarned: Number(record.daysEarned),
      daysUsed: Number(record.daysUsed),
      daysAvailable: Number(record.daysAvailable),
      expiryDate: record.expiryDate,
      status: record.status,
      hasAttendanceRecord: hasAttendance,
      createdAt: record.createdAt.toISOString(),
    };
  }

  // ── Comp-Off Balance Summary ────────────────────────────────────────────
  async getBalance(orgId: string, userId: string) {
    const records = await this.db
      .select()
      .from(schema.compOffRecords)
      .where(
        and(
          eq(schema.compOffRecords.orgId, orgId),
          eq(schema.compOffRecords.employeeId, userId),
        ),
      );

    let totalEarned = 0;
    let totalUsed = 0;
    let totalAvailable = 0;
    let totalExpired = 0;
    let totalCancelled = 0;

    for (const r of records) {
      const earned = Number(r.daysEarned);
      const used = Number(r.daysUsed);
      const available = Number(r.daysAvailable);

      totalEarned += earned;

      if (r.status === 'used') {
        totalUsed += used;
      } else if (r.status === 'expired') {
        totalExpired += earned;
      } else if (r.status === 'cancelled') {
        totalCancelled += earned;
      } else if (r.status === 'active') {
        totalUsed += used;
        totalAvailable += available;
      }
    }

    return {
      totalEarned,
      totalUsed,
      totalAvailable,
      totalExpired,
      totalCancelled,
      activeRecords: records.filter((r) => r.status === 'active').length,
    };
  }

  // ── Comp-Off Earning Rules ──────────────────────────────────────────────
  async getRules(orgId: string) {
    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
          eq(schema.leavePolicies.isActive, true),
        ),
      )
      .limit(1);

    return {
      earningRules: policy?.compOffEarningRules || {},
      expiryDays: policy?.compOffExpiryDays || 90,
      encashmentRules: policy?.encashmentRules || {},
    };
  }

  // ── Expiring Soon ───────────────────────────────────────────────────────
  async getExpiringSoon(orgId: string, userId: string) {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const todayStr = today.toISOString().slice(0, 10);
    const futureStr = thirtyDaysFromNow.toISOString().slice(0, 10);

    const records = await this.db
      .select()
      .from(schema.compOffRecords)
      .where(
        and(
          eq(schema.compOffRecords.orgId, orgId),
          eq(schema.compOffRecords.employeeId, userId),
          eq(schema.compOffRecords.status, 'active'),
          gte(schema.compOffRecords.expiryDate, todayStr),
          lte(schema.compOffRecords.expiryDate, futureStr),
        ),
      )
      .orderBy(schema.compOffRecords.expiryDate);

    return {
      data: records.map((r) => {
        const expiryDate = new Date(r.expiryDate!);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: r.id,
          earnedDate: r.earnedDate,
          reason: r.reason,
          workType: r.workType,
          daysAvailable: Number(r.daysAvailable),
          expiryDate: r.expiryDate,
          daysUntilExpiry,
          status: r.status,
        };
      }),
      totalExpiringSoon: records.length,
      totalDaysAtRisk: records.reduce((sum, r) => sum + Number(r.daysAvailable), 0),
    };
  }

  // ── Apply Leave Using Comp-Off ──────────────────────────────────────────
  async applyLeaveWithCompOff(orgId: string, userId: string, data: Record<string, any>) {
    const { fromDate, toDate, reason, compOffRecordIds, delegateId } = data;

    if (!fromDate || !toDate || !reason) {
      throw new BadRequestException('fromDate, toDate, and reason are required');
    }

    // Find the comp-off leave type
    const [compOffType] = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isCompOff, true),
          eq(schema.leaveTypes.isActive, true),
        ),
      )
      .limit(1);

    if (!compOffType) {
      throw new BadRequestException('Comp-off leave type is not configured');
    }

    // Calculate total days needed
    const totalDays = await this.calculateTotalDays(orgId, fromDate, toDate);

    if (totalDays <= 0) {
      throw new BadRequestException('No working days in the selected date range');
    }

    // Check available comp-off balance
    const activeRecords = await this.db
      .select()
      .from(schema.compOffRecords)
      .where(
        and(
          eq(schema.compOffRecords.orgId, orgId),
          eq(schema.compOffRecords.employeeId, userId),
          eq(schema.compOffRecords.status, 'active'),
        ),
      )
      .orderBy(schema.compOffRecords.expiryDate); // Use earliest expiring first

    const totalAvailable = activeRecords.reduce((sum, r) => sum + Number(r.daysAvailable), 0);

    if (totalAvailable < totalDays) {
      throw new BadRequestException(`Insufficient comp-off balance. Available: ${totalAvailable}, Requested: ${totalDays}`);
    }

    // Create leave request
    const [request] = await this.db
      .insert(schema.leaveRequests)
      .values({
        orgId,
        employeeId: userId,
        leaveTypeId: compOffType.id,
        fromDate,
        toDate,
        totalDays: totalDays.toString(),
        isHalfDay: false,
        reason,
        status: 'pending',
        delegateId: delegateId || null,
        metadata: { isCompOffLeave: true, compOffRecordIds: compOffRecordIds || [] },
      })
      .returning();

    // Deduct from comp-off records (FIFO by expiry date)
    let remaining = totalDays;
    for (const record of activeRecords) {
      if (remaining <= 0) break;
      const available = Number(record.daysAvailable);
      const toUse = Math.min(available, remaining);

      const newUsed = Number(record.daysUsed) + toUse;
      const newAvailable = available - toUse;
      const newStatus = newAvailable <= 0 ? 'used' : 'active';

      await this.db
        .update(schema.compOffRecords)
        .set({
          daysUsed: newUsed.toString(),
          daysAvailable: newAvailable.toString(),
          status: newStatus,
          linkedLeaveRequestId: request.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.compOffRecords.id, record.id));

      remaining -= toUse;
    }

    // Update leave balance if exists
    const year = new Date(fromDate).getFullYear().toString();
    const [balance] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.leaveTypeId, compOffType.id),
          eq(schema.leaveBalances.year, year),
        ),
      )
      .limit(1);

    if (balance) {
      await this.db
        .update(schema.leaveBalances)
        .set({
          pending: sql`${schema.leaveBalances.pending}::numeric + ${totalDays}`,
          available: sql`${schema.leaveBalances.available}::numeric - ${totalDays}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.leaveBalances.id, balance.id));
    }

    return {
      id: request.id,
      orgId: request.orgId,
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      fromDate: request.fromDate,
      toDate: request.toDate,
      totalDays: Number(request.totalDays),
      status: request.status,
      reason: request.reason,
      metadata: request.metadata,
      createdAt: request.createdAt.toISOString(),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async calculateTotalDays(orgId: string, fromDate: string, toDate: string): Promise<number> {
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
    if (weekendDays.length === 0) {
      weekendDays.push(0, 6);
    }

    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, fromDate),
          lte(schema.holidayCalendars.date, toDate),
        ),
      );
    const holidayDates = new Set(holidays.map((h) => h.date));

    let count = 0;
    const cursor = new Date(fromDate);
    const end = new Date(toDate);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const dayOfWeek = cursor.getDay();
      if (!weekendDays.includes(dayOfWeek) && !holidayDates.has(dateStr)) {
        count++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }
}
