import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, ne, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ApplyLeaveService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Submit Leave Request ────────────────────────────────────────────────
  async applyLeave(orgId: string, userId: string, data: Record<string, any>) {
    const { leaveTypeId, fromDate, toDate, reason, isHalfDay, halfDayType, attachments, delegateId, dayBreakdown } = data;

    if (!leaveTypeId || !fromDate || !toDate || !reason) {
      throw new BadRequestException('leaveTypeId, fromDate, toDate, and reason are required');
    }

    if (new Date(fromDate) > new Date(toDate)) {
      throw new BadRequestException('fromDate cannot be after toDate');
    }

    // Get leave type
    const [leaveType] = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.id, leaveTypeId),
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      )
      .limit(1);

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Calculate total days
    const totalDays = await this.calculateTotalDays(orgId, fromDate, toDate, isHalfDay);

    if (totalDays <= 0) {
      throw new BadRequestException('No working days in the selected date range');
    }

    // Check min/max consecutive day limits
    if (leaveType.minConsecutiveDays && totalDays < leaveType.minConsecutiveDays) {
      throw new BadRequestException(`Minimum ${leaveType.minConsecutiveDays} consecutive days required for this leave type`);
    }
    if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
      throw new BadRequestException(`Maximum ${leaveType.maxConsecutiveDays} consecutive days allowed for this leave type`);
    }

    // Get current year
    const year = new Date(fromDate).getFullYear().toString();

    // Check balance
    const [balance] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.leaveTypeId, leaveTypeId),
          eq(schema.leaveBalances.year, year),
        ),
      )
      .limit(1);

    const available = balance ? Number(balance.available) : 0;

    // Check if negative balance is allowed
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

    const negativeAllowed = policy?.negativeBalanceAllowed || false;
    const maxNegative = policy?.maxNegativeBalanceDays || 0;

    if (!negativeAllowed && available < totalDays) {
      throw new BadRequestException(`Insufficient leave balance. Available: ${available}, Requested: ${totalDays}`);
    }

    if (negativeAllowed && (available - totalDays) < -maxNegative) {
      throw new BadRequestException(`Exceeds maximum negative balance of ${maxNegative} days`);
    }

    // Check min days before request
    if (policy?.minDaysBeforeRequest && policy.minDaysBeforeRequest > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requestDate = new Date(fromDate);
      const diffDays = Math.ceil((requestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < policy.minDaysBeforeRequest) {
        throw new BadRequestException(`Leave must be requested at least ${policy.minDaysBeforeRequest} days in advance`);
      }
    }

    // Create leave request
    const [request] = await this.db
      .insert(schema.leaveRequests)
      .values({
        orgId,
        employeeId: userId,
        leaveTypeId,
        fromDate,
        toDate,
        totalDays: totalDays.toString(),
        isHalfDay: isHalfDay || false,
        halfDayType: halfDayType || null,
        reason,
        attachments: attachments || [],
        status: 'pending',
        delegateId: delegateId || null,
        dayBreakdown: dayBreakdown || [],
      })
      .returning();

    // Update balance: increment pending, decrement available
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

    return this.toRequestDto(request);
  }

  // ── Save as Draft ───────────────────────────────────────────────────────
  async saveDraft(orgId: string, userId: string, data: Record<string, any>) {
    const { leaveTypeId, fromDate, toDate, reason, isHalfDay, halfDayType, attachments, delegateId, dayBreakdown } = data;

    if (!leaveTypeId || !fromDate || !toDate) {
      throw new BadRequestException('leaveTypeId, fromDate, and toDate are required');
    }

    // Verify leave type exists
    const [leaveType] = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.id, leaveTypeId),
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      )
      .limit(1);

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    const totalDays = await this.calculateTotalDays(orgId, fromDate, toDate, isHalfDay);

    // Create as draft — no balance changes
    const [request] = await this.db
      .insert(schema.leaveRequests)
      .values({
        orgId,
        employeeId: userId,
        leaveTypeId,
        fromDate,
        toDate,
        totalDays: totalDays.toString(),
        isHalfDay: isHalfDay || false,
        halfDayType: halfDayType || null,
        reason: reason || null,
        attachments: attachments || [],
        status: 'draft',
        delegateId: delegateId || null,
        dayBreakdown: dayBreakdown || [],
      })
      .returning();

    return this.toRequestDto(request);
  }

  // ── Submit Draft ────────────────────────────────────────────────────────
  async submitDraft(orgId: string, userId: string, requestId: string) {
    const [request] = await this.db
      .select()
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.id, requestId),
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== 'draft') {
      throw new BadRequestException('Only draft requests can be submitted');
    }

    const totalDays = Number(request.totalDays);
    const year = new Date(request.fromDate).getFullYear().toString();

    // Check balance
    const [balance] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.leaveTypeId, request.leaveTypeId),
          eq(schema.leaveBalances.year, year),
        ),
      )
      .limit(1);

    const available = balance ? Number(balance.available) : 0;

    // Check negative balance policy
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

    const negativeAllowed = policy?.negativeBalanceAllowed || false;
    const maxNegative = policy?.maxNegativeBalanceDays || 0;

    if (!negativeAllowed && available < totalDays) {
      throw new BadRequestException(`Insufficient leave balance. Available: ${available}, Requested: ${totalDays}`);
    }

    if (negativeAllowed && (available - totalDays) < -maxNegative) {
      throw new BadRequestException(`Exceeds maximum negative balance of ${maxNegative} days`);
    }

    // Update status to pending
    const [updated] = await this.db
      .update(schema.leaveRequests)
      .set({
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(schema.leaveRequests.id, requestId))
      .returning();

    // Update balance
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

    return this.toRequestDto(updated);
  }

  // ── Cancel Request ──────────────────────────────────────────────────────
  async cancelRequest(orgId: string, userId: string, requestId: string, data: Record<string, any>) {
    const [request] = await this.db
      .select()
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.id, requestId),
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== 'pending' && request.status !== 'draft') {
      throw new BadRequestException('Only pending or draft requests can be cancelled');
    }

    const totalDays = Number(request.totalDays);
    const wasPending = request.status === 'pending';

    const [updated] = await this.db
      .update(schema.leaveRequests)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: data.cancelReason || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.leaveRequests.id, requestId))
      .returning();

    // Restore balance only if it was pending (drafts don't affect balance)
    if (wasPending) {
      const year = new Date(request.fromDate).getFullYear().toString();
      const [balance] = await this.db
        .select()
        .from(schema.leaveBalances)
        .where(
          and(
            eq(schema.leaveBalances.orgId, orgId),
            eq(schema.leaveBalances.employeeId, userId),
            eq(schema.leaveBalances.leaveTypeId, request.leaveTypeId),
            eq(schema.leaveBalances.year, year),
          ),
        )
        .limit(1);

      if (balance) {
        await this.db
          .update(schema.leaveBalances)
          .set({
            pending: sql`${schema.leaveBalances.pending}::numeric - ${totalDays}`,
            available: sql`${schema.leaveBalances.available}::numeric + ${totalDays}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.leaveBalances.id, balance.id));
      }
    }

    return this.toRequestDto(updated);
  }

  // ── Team Conflicts ──────────────────────────────────────────────────────
  async getTeamConflicts(orgId: string, userId: string, fromDate: string, toDate: string) {
    if (!fromDate || !toDate) {
      throw new BadRequestException('fromDate and toDate are required');
    }

    // Get employee's manager to find team members
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, userId),
        ),
      )
      .limit(1);

    const managerId = profile?.managerId;

    // Find team members (same manager or direct reports)
    let teamMemberIds: string[] = [];

    if (managerId) {
      // Get employees with the same manager
      const teamMembers = await this.db
        .select({ userId: schema.employeeProfiles.userId })
        .from(schema.employeeProfiles)
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            eq(schema.employeeProfiles.managerId, managerId),
            ne(schema.employeeProfiles.userId, userId),
          ),
        );
      teamMemberIds = teamMembers.map((m) => m.userId);
    }

    if (teamMemberIds.length === 0) {
      return { conflicts: [], totalConflicts: 0 };
    }

    // Find overlapping leaves
    const conflicts = await this.db
      .select({
        id: schema.leaveRequests.id,
        employeeId: schema.leaveRequests.employeeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        status: schema.leaveRequests.status,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeColor: schema.leaveTypes.color,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .innerJoin(schema.users, eq(schema.leaveRequests.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamMemberIds),
          or(
            eq(schema.leaveRequests.status, 'approved'),
            eq(schema.leaveRequests.status, 'pending'),
          ),
          lte(schema.leaveRequests.fromDate, toDate),
          gte(schema.leaveRequests.toDate, fromDate),
        ),
      )
      .orderBy(schema.leaveRequests.fromDate);

    return {
      conflicts: conflicts.map((c) => ({
        id: c.id,
        employeeId: c.employeeId,
        employeeName: `${c.employeeFirstName} ${c.employeeLastName || ''}`.trim(),
        fromDate: c.fromDate,
        toDate: c.toDate,
        totalDays: Number(c.totalDays),
        status: c.status,
        leaveTypeName: c.leaveTypeName,
        leaveTypeColor: c.leaveTypeColor,
      })),
      totalConflicts: conflicts.length,
    };
  }

  // ── Check Balance ───────────────────────────────────────────────────────
  async checkBalance(orgId: string, userId: string, leaveTypeId: string, year?: string) {
    if (!leaveTypeId) {
      throw new BadRequestException('leaveTypeId is required');
    }

    const targetYear = year || new Date().getFullYear().toString();

    const [balance] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.leaveTypeId, leaveTypeId),
          eq(schema.leaveBalances.year, targetYear),
        ),
      )
      .limit(1);

    const [leaveType] = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.id, leaveTypeId),
          eq(schema.leaveTypes.orgId, orgId),
        ),
      )
      .limit(1);

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return {
      leaveTypeId,
      leaveTypeName: leaveType.name,
      year: targetYear,
      entitled: balance ? Number(balance.entitled) : 0,
      accrued: balance ? Number(balance.accrued) : 0,
      used: balance ? Number(balance.used) : 0,
      pending: balance ? Number(balance.pending) : 0,
      carriedForward: balance ? Number(balance.carriedForward) : 0,
      adjusted: balance ? Number(balance.adjusted) : 0,
      available: balance ? Number(balance.available) : 0,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Calculate working days between two dates, excluding weekends and holidays */
  private async calculateTotalDays(
    orgId: string,
    fromDate: string,
    toDate: string,
    isHalfDay?: boolean,
  ): Promise<number> {
    if (isHalfDay) return 0.5;

    // Get org work week config
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

    // If no work week configured, default to Saturday+Sunday off
    if (weekendDays.length === 0) {
      weekendDays.push(0, 6); // Sunday, Saturday
    }

    // Get holidays in range
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

    // Check sandwich rule
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

    const sandwichRule = policy?.sandwichRuleEnabled || false;

    let count = 0;
    const cursor = new Date(fromDate);
    const end = new Date(toDate);

    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const dayOfWeek = cursor.getDay();

      if (sandwichRule) {
        // Sandwich rule: count weekends/holidays between leave days
        count++;
      } else {
        // Normal: skip weekends and holidays
        if (!weekendDays.includes(dayOfWeek) && !holidayDates.has(dateStr)) {
          count++;
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  private toRequestDto(row: typeof schema.leaveRequests.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      leaveTypeId: row.leaveTypeId,
      fromDate: row.fromDate,
      toDate: row.toDate,
      totalDays: Number(row.totalDays),
      isHalfDay: row.isHalfDay,
      halfDayType: row.halfDayType,
      reason: row.reason,
      attachments: row.attachments,
      status: row.status,
      approvalChain: row.approvalChain,
      currentApproverLevel: row.currentApproverLevel,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt?.toISOString() || null,
      approverComment: row.approverComment,
      cancelledAt: row.cancelledAt?.toISOString() || null,
      cancelReason: row.cancelReason,
      delegateId: row.delegateId,
      dayBreakdown: row.dayBreakdown,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
