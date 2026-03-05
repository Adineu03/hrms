import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte, sql, or, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveHistoryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── All Leave Requests ──────────────────────────────────────────────────
  async getAllRequests(
    orgId: string,
    userId: string,
    filters: {
      leaveTypeId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    },
  ) {
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.leaveRequests.orgId, orgId),
      eq(schema.leaveRequests.employeeId, userId),
    ];

    if (filters.leaveTypeId) {
      conditions.push(eq(schema.leaveRequests.leaveTypeId, filters.leaveTypeId));
    }
    if (filters.status) {
      conditions.push(eq(schema.leaveRequests.status, filters.status));
    }
    if (filters.startDate) {
      conditions.push(gte(schema.leaveRequests.fromDate, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(schema.leaveRequests.toDate, filters.endDate));
    }

    const whereClause = and(...conditions);

    // Count total
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.leaveRequests)
      .where(whereClause);
    const total = countResult?.count || 0;

    // Fetch data
    const requests = await this.db
      .select({
        id: schema.leaveRequests.id,
        leaveTypeId: schema.leaveRequests.leaveTypeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        reason: schema.leaveRequests.reason,
        status: schema.leaveRequests.status,
        approverComment: schema.leaveRequests.approverComment,
        cancelReason: schema.leaveRequests.cancelReason,
        createdAt: schema.leaveRequests.createdAt,
        updatedAt: schema.leaveRequests.updatedAt,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(whereClause)
      .orderBy(desc(schema.leaveRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: requests.map((r) => ({
        id: r.id,
        leaveTypeId: r.leaveTypeId,
        leaveTypeName: r.leaveTypeName,
        leaveTypeCode: r.leaveTypeCode,
        leaveTypeColor: r.leaveTypeColor,
        fromDate: r.fromDate,
        toDate: r.toDate,
        totalDays: Number(r.totalDays),
        isHalfDay: r.isHalfDay,
        halfDayType: r.halfDayType,
        reason: r.reason,
        status: r.status,
        approverComment: r.approverComment,
        cancelReason: r.cancelReason,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Single Leave Request Detail ─────────────────────────────────────────
  async getRequestDetail(orgId: string, userId: string, requestId: string) {
    const [request] = await this.db
      .select({
        id: schema.leaveRequests.id,
        orgId: schema.leaveRequests.orgId,
        employeeId: schema.leaveRequests.employeeId,
        leaveTypeId: schema.leaveRequests.leaveTypeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        reason: schema.leaveRequests.reason,
        attachments: schema.leaveRequests.attachments,
        status: schema.leaveRequests.status,
        approvalChain: schema.leaveRequests.approvalChain,
        currentApproverLevel: schema.leaveRequests.currentApproverLevel,
        approvedBy: schema.leaveRequests.approvedBy,
        approvedAt: schema.leaveRequests.approvedAt,
        approverComment: schema.leaveRequests.approverComment,
        cancelledAt: schema.leaveRequests.cancelledAt,
        cancelReason: schema.leaveRequests.cancelReason,
        delegateId: schema.leaveRequests.delegateId,
        dayBreakdown: schema.leaveRequests.dayBreakdown,
        metadata: schema.leaveRequests.metadata,
        createdAt: schema.leaveRequests.createdAt,
        updatedAt: schema.leaveRequests.updatedAt,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
        isPaid: schema.leaveTypes.isPaid,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
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

    // Resolve approver name if present
    let approverName: string | null = null;
    if (request.approvedBy) {
      const [approver] = await this.db
        .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.id, request.approvedBy))
        .limit(1);
      if (approver) {
        approverName = `${approver.firstName} ${approver.lastName || ''}`.trim();
      }
    }

    // Resolve delegate name if present
    let delegateName: string | null = null;
    if (request.delegateId) {
      const [delegate] = await this.db
        .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.id, request.delegateId))
        .limit(1);
      if (delegate) {
        delegateName = `${delegate.firstName} ${delegate.lastName || ''}`.trim();
      }
    }

    return {
      id: request.id,
      leaveTypeId: request.leaveTypeId,
      leaveTypeName: request.leaveTypeName,
      leaveTypeCode: request.leaveTypeCode,
      leaveTypeColor: request.leaveTypeColor,
      isPaid: request.isPaid,
      fromDate: request.fromDate,
      toDate: request.toDate,
      totalDays: Number(request.totalDays),
      isHalfDay: request.isHalfDay,
      halfDayType: request.halfDayType,
      reason: request.reason,
      attachments: request.attachments,
      status: request.status,
      approvalChain: request.approvalChain,
      currentApproverLevel: request.currentApproverLevel,
      approvedBy: request.approvedBy,
      approverName,
      approvedAt: request.approvedAt?.toISOString() || null,
      approverComment: request.approverComment,
      cancelledAt: request.cancelledAt?.toISOString() || null,
      cancelReason: request.cancelReason,
      delegateId: request.delegateId,
      delegateName,
      dayBreakdown: request.dayBreakdown,
      metadata: request.metadata,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  // ── Reapply Rejected Leave ──────────────────────────────────────────────
  async reapplyLeave(orgId: string, userId: string, requestId: string, data: Record<string, any>) {
    // Get the original request
    const [original] = await this.db
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

    if (!original) {
      throw new NotFoundException('Leave request not found');
    }

    if (original.status !== 'rejected') {
      throw new BadRequestException('Only rejected requests can be reapplied');
    }

    // Merge original data with any overrides
    const newFromDate = data.fromDate || original.fromDate;
    const newToDate = data.toDate || original.toDate;
    const newReason = data.reason || original.reason;
    const newLeaveTypeId = data.leaveTypeId || original.leaveTypeId;
    const newIsHalfDay = data.isHalfDay !== undefined ? data.isHalfDay : original.isHalfDay;
    const newHalfDayType = data.halfDayType !== undefined ? data.halfDayType : original.halfDayType;
    const newAttachments = data.attachments || original.attachments;
    const newDelegateId = data.delegateId !== undefined ? data.delegateId : original.delegateId;
    const newDayBreakdown = data.dayBreakdown || original.dayBreakdown;

    // Calculate total days
    const totalDays = await this.calculateTotalDays(orgId, newFromDate, newToDate, newIsHalfDay);

    if (totalDays <= 0) {
      throw new BadRequestException('No working days in the selected date range');
    }

    // Check balance
    const year = new Date(newFromDate).getFullYear().toString();
    const [balance] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.leaveTypeId, newLeaveTypeId),
          eq(schema.leaveBalances.year, year),
        ),
      )
      .limit(1);

    const available = balance ? Number(balance.available) : 0;
    if (available < totalDays) {
      throw new BadRequestException(`Insufficient leave balance. Available: ${available}, Requested: ${totalDays}`);
    }

    // Create new request
    const [newRequest] = await this.db
      .insert(schema.leaveRequests)
      .values({
        orgId,
        employeeId: userId,
        leaveTypeId: newLeaveTypeId,
        fromDate: newFromDate,
        toDate: newToDate,
        totalDays: totalDays.toString(),
        isHalfDay: newIsHalfDay || false,
        halfDayType: newHalfDayType || null,
        reason: newReason,
        attachments: newAttachments || [],
        status: 'pending',
        delegateId: newDelegateId || null,
        dayBreakdown: newDayBreakdown || [],
        metadata: { reappliedFrom: requestId },
      })
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

    return this.toRequestDto(newRequest);
  }

  // ── Year-to-Date Summary ────────────────────────────────────────────────
  async getSummary(orgId: string, userId: string, year?: string) {
    const targetYear = year || new Date().getFullYear().toString();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const requests = await this.db
      .select({
        totalDays: schema.leaveRequests.totalDays,
        status: schema.leaveRequests.status,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeColor: schema.leaveTypes.color,
        leaveTypeCode: schema.leaveTypes.code,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.fromDate, endDate),
        ),
      );

    // Aggregate by leave type and status
    const byType: Record<string, { name: string; code: string; color: string; approved: number; pending: number; rejected: number; cancelled: number }> = {};
    let totalApproved = 0;
    let totalPending = 0;
    let totalRejected = 0;
    let totalCancelled = 0;

    for (const r of requests) {
      const key = r.leaveTypeName;
      if (!byType[key]) {
        byType[key] = {
          name: r.leaveTypeName,
          code: r.leaveTypeCode,
          color: r.leaveTypeColor || '#4F46E5',
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
        };
      }

      const days = Number(r.totalDays);

      if (r.status === 'approved') {
        byType[key].approved += days;
        totalApproved += days;
      } else if (r.status === 'pending') {
        byType[key].pending += days;
        totalPending += days;
      } else if (r.status === 'rejected') {
        byType[key].rejected += days;
        totalRejected += days;
      } else if (r.status === 'cancelled') {
        byType[key].cancelled += days;
        totalCancelled += days;
      }
    }

    return {
      year: targetYear,
      totalApproved,
      totalPending,
      totalRejected,
      totalCancelled,
      totalRequests: requests.length,
      byType: Object.values(byType),
    };
  }

  // ── Leave Usage Trends ──────────────────────────────────────────────────
  async getTrends(orgId: string, userId: string) {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    const requests = await this.db
      .select({
        fromDate: schema.leaveRequests.fromDate,
        totalDays: schema.leaveRequests.totalDays,
        status: schema.leaveRequests.status,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.fromDate, endDate),
          eq(schema.leaveRequests.status, 'approved'),
        ),
      );

    // Build month buckets
    const monthlyData: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = 0;
    }

    for (const r of requests) {
      const key = r.fromDate.slice(0, 7);
      if (monthlyData[key] !== undefined) {
        monthlyData[key] += Number(r.totalDays);
      }
    }

    const months = Object.entries(monthlyData).map(([month, totalDays]) => ({
      month,
      totalDays,
    }));

    // Calculate average
    const totalDaysUsed = months.reduce((sum, m) => sum + m.totalDays, 0);
    const avgPerMonth = months.length > 0 ? Math.round((totalDaysUsed / months.length) * 10) / 10 : 0;

    return { months, totalDaysUsed, avgPerMonth };
  }

  // ── Pending Requests ────────────────────────────────────────────────────
  async getPendingRequests(orgId: string, userId: string) {
    const requests = await this.db
      .select({
        id: schema.leaveRequests.id,
        leaveTypeId: schema.leaveRequests.leaveTypeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        reason: schema.leaveRequests.reason,
        status: schema.leaveRequests.status,
        createdAt: schema.leaveRequests.createdAt,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          or(
            eq(schema.leaveRequests.status, 'pending'),
            eq(schema.leaveRequests.status, 'draft'),
          ),
        ),
      )
      .orderBy(desc(schema.leaveRequests.createdAt));

    return {
      data: requests.map((r) => ({
        id: r.id,
        leaveTypeId: r.leaveTypeId,
        leaveTypeName: r.leaveTypeName,
        leaveTypeCode: r.leaveTypeCode,
        leaveTypeColor: r.leaveTypeColor,
        fromDate: r.fromDate,
        toDate: r.toDate,
        totalDays: Number(r.totalDays),
        isHalfDay: r.isHalfDay,
        halfDayType: r.halfDayType,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      total: requests.length,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async calculateTotalDays(
    orgId: string,
    fromDate: string,
    toDate: string,
    isHalfDay?: boolean,
  ): Promise<number> {
    if (isHalfDay) return 0.5;

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
