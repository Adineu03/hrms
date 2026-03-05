import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveApprovalQueueService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const team = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return team.map((t) => t.userId);
  }

  async getPendingQueue(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    if (teamIds.length === 0) {
      return { total: 0, requests: [] };
    }

    // Get pending leave requests from direct reports
    const pendingRequests = await this.db
      .select({
        id: schema.leaveRequests.id,
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
        dayBreakdown: schema.leaveRequests.dayBreakdown,
        createdAt: schema.leaveRequests.createdAt,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
        leaveTypeIsPaid: schema.leaveTypes.isPaid,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.users, eq(schema.leaveRequests.employeeId, schema.users.id))
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          eq(schema.leaveRequests.status, 'pending'),
        ),
      )
      .orderBy(desc(schema.leaveRequests.createdAt));

    // Get leave balances for each employee-leaveType pair
    const balanceMap = new Map<string, any>();
    if (pendingRequests.length > 0) {
      const currentYear = String(new Date().getFullYear());
      const balances = await this.db
        .select()
        .from(schema.leaveBalances)
        .where(
          and(
            eq(schema.leaveBalances.orgId, orgId),
            inArray(schema.leaveBalances.employeeId, teamIds),
            eq(schema.leaveBalances.year, currentYear),
          ),
        );

      for (const bal of balances) {
        const key = `${bal.employeeId}:${bal.leaveTypeId}`;
        balanceMap.set(key, {
          entitled: Number(bal.entitled),
          accrued: Number(bal.accrued),
          used: Number(bal.used),
          pending: Number(bal.pending),
          carriedForward: Number(bal.carriedForward),
          adjusted: Number(bal.adjusted),
          available: Number(bal.available),
        });
      }
    }

    const requests = pendingRequests.map((req) => {
      const balanceKey = `${req.employeeId}:${req.leaveTypeId}`;
      const balance = balanceMap.get(balanceKey) ?? null;

      return {
        id: req.id,
        employeeId: req.employeeId,
        employeeName: `${req.employeeFirstName} ${req.employeeLastName ?? ''}`.trim(),
        employeeEmail: req.employeeEmail,
        leaveType: {
          id: req.leaveTypeId,
          name: req.leaveTypeName,
          code: req.leaveTypeCode,
          color: req.leaveTypeColor,
          isPaid: req.leaveTypeIsPaid,
        },
        fromDate: req.fromDate,
        toDate: req.toDate,
        totalDays: Number(req.totalDays),
        isHalfDay: req.isHalfDay,
        halfDayType: req.halfDayType,
        reason: req.reason,
        attachments: req.attachments,
        dayBreakdown: req.dayBreakdown,
        createdAt: req.createdAt,
        balance,
      };
    });

    return { total: requests.length, requests };
  }

  async approveRequest(orgId: string, managerId: string, requestId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [request] = await this.db
      .select()
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.id, requestId),
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          eq(schema.leaveRequests.status, 'pending'),
        ),
      );

    if (!request) {
      throw new NotFoundException('Leave request not found or not in pending status');
    }

    const now = new Date();

    await this.db
      .update(schema.leaveRequests)
      .set({
        status: 'approved',
        approvedBy: managerId,
        approvedAt: now,
        approverComment: body.comment ?? null,
        updatedAt: now,
      })
      .where(eq(schema.leaveRequests.id, requestId));

    // Update leave balances: deduct from pending, add to used, recalc available
    await this.db
      .update(schema.leaveBalances)
      .set({
        pending: sql`${schema.leaveBalances.pending}::numeric - ${Number(request.totalDays)}`,
        used: sql`${schema.leaveBalances.used}::numeric + ${Number(request.totalDays)}`,
        available: sql`${schema.leaveBalances.available}::numeric - ${Number(request.totalDays)}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, request.employeeId),
          eq(schema.leaveBalances.leaveTypeId, request.leaveTypeId),
          eq(schema.leaveBalances.year, String(new Date(request.fromDate).getFullYear())),
        ),
      );

    return {
      id: requestId,
      status: 'approved',
      approvedBy: managerId,
      approvedAt: now.toISOString(),
      comment: body.comment ?? null,
    };
  }

  async rejectRequest(orgId: string, managerId: string, requestId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [request] = await this.db
      .select()
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.id, requestId),
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          eq(schema.leaveRequests.status, 'pending'),
        ),
      );

    if (!request) {
      throw new NotFoundException('Leave request not found or not in pending status');
    }

    const now = new Date();

    await this.db
      .update(schema.leaveRequests)
      .set({
        status: 'rejected',
        approvedBy: managerId,
        approvedAt: now,
        approverComment: body.comment ?? null,
        updatedAt: now,
      })
      .where(eq(schema.leaveRequests.id, requestId));

    // Restore pending balance
    await this.db
      .update(schema.leaveBalances)
      .set({
        pending: sql`${schema.leaveBalances.pending}::numeric - ${Number(request.totalDays)}`,
        available: sql`${schema.leaveBalances.available}::numeric + ${Number(request.totalDays)}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, request.employeeId),
          eq(schema.leaveBalances.leaveTypeId, request.leaveTypeId),
          eq(schema.leaveBalances.year, String(new Date(request.fromDate).getFullYear())),
        ),
      );

    return {
      id: requestId,
      status: 'rejected',
      rejectedBy: managerId,
      rejectedAt: now.toISOString(),
      comment: body.comment ?? null,
    };
  }

  async bulkApprove(orgId: string, managerId: string, body: Record<string, any>) {
    const { requestIds } = body;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      throw new BadRequestException('requestIds array is required');
    }

    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    const now = new Date();
    const results: { id: string; status: string; error?: string }[] = [];

    for (const requestId of requestIds) {
      try {
        const [request] = await this.db
          .select()
          .from(schema.leaveRequests)
          .where(
            and(
              eq(schema.leaveRequests.id, requestId),
              eq(schema.leaveRequests.orgId, orgId),
              inArray(schema.leaveRequests.employeeId, teamIds),
              eq(schema.leaveRequests.status, 'pending'),
            ),
          );

        if (!request) {
          results.push({ id: requestId, status: 'error', error: 'Not found or not pending' });
          continue;
        }

        await this.db
          .update(schema.leaveRequests)
          .set({
            status: 'approved',
            approvedBy: managerId,
            approvedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.leaveRequests.id, requestId));

        // Update leave balances
        await this.db
          .update(schema.leaveBalances)
          .set({
            pending: sql`${schema.leaveBalances.pending}::numeric - ${Number(request.totalDays)}`,
            used: sql`${schema.leaveBalances.used}::numeric + ${Number(request.totalDays)}`,
            available: sql`${schema.leaveBalances.available}::numeric - ${Number(request.totalDays)}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.leaveBalances.orgId, orgId),
              eq(schema.leaveBalances.employeeId, request.employeeId),
              eq(schema.leaveBalances.leaveTypeId, request.leaveTypeId),
              eq(schema.leaveBalances.year, String(new Date(request.fromDate).getFullYear())),
            ),
          );

        results.push({ id: requestId, status: 'approved' });
      } catch {
        results.push({ id: requestId, status: 'error', error: 'Processing failed' });
      }
    }

    return {
      total: requestIds.length,
      approved: results.filter((r) => r.status === 'approved').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    };
  }

  async getEmployeeLeaveHistory(orgId: string, managerId: string, requestId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    // First get the request to find the employee
    const [request] = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.id, requestId),
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
        ),
      );

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Get all leave history for this employee
    const history = await this.db
      .select({
        id: schema.leaveRequests.id,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        status: schema.leaveRequests.status,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        reason: schema.leaveRequests.reason,
        approverComment: schema.leaveRequests.approverComment,
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
          eq(schema.leaveRequests.employeeId, request.employeeId),
        ),
      )
      .orderBy(desc(schema.leaveRequests.createdAt));

    return {
      employeeId: request.employeeId,
      totalRecords: history.length,
      history: history.map((h) => ({
        id: h.id,
        leaveType: h.leaveTypeName,
        leaveTypeCode: h.leaveTypeCode,
        leaveTypeColor: h.leaveTypeColor,
        fromDate: h.fromDate,
        toDate: h.toDate,
        totalDays: Number(h.totalDays),
        status: h.status,
        isHalfDay: h.isHalfDay,
        halfDayType: h.halfDayType,
        reason: h.reason,
        approverComment: h.approverComment,
        createdAt: h.createdAt,
      })),
    };
  }
}
