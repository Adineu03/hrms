import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sql, gte, lte, asc, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { overtimeRequests } from '../../../../infrastructure/database/schema/overtime-requests';

@Injectable()
export class OvertimeApprovalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private toDto(row: Record<string, any>) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      date: row.date,
      type: row.type,
      estimatedHours: row.estimatedHours,
      actualHours: row.actualHours,
      reason: row.reason,
      reasonCode: row.reasonCode,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      reviewerComment: row.reviewerComment,
      overtimeRate: row.overtimeRate,
      compOffEligible: row.compOffEligible,
      createdAt: row.createdAt,
    };
  }

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
          eq(users.isActive, true),
        ),
      );
    return members.map((m) => m.userId);
  }

  async listRequests(
    orgId: string,
    managerId: string,
    filters: { status?: string; startDate?: string; endDate?: string },
  ) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return { data: [], total: 0 };
    }

    const conditions: any[] = [
      eq(overtimeRequests.orgId, orgId),
      inArray(overtimeRequests.employeeId, teamMemberIds),
    ];

    if (filters.status) {
      conditions.push(eq(overtimeRequests.status, filters.status));
    }
    if (filters.startDate) {
      conditions.push(gte(overtimeRequests.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(overtimeRequests.date, filters.endDate));
    }

    const rows = await this.db
      .select({
        id: overtimeRequests.id,
        employeeId: overtimeRequests.employeeId,
        firstName: users.firstName,
        lastName: users.lastName,
        date: overtimeRequests.date,
        type: overtimeRequests.type,
        estimatedHours: overtimeRequests.estimatedHours,
        actualHours: overtimeRequests.actualHours,
        reason: overtimeRequests.reason,
        reasonCode: overtimeRequests.reasonCode,
        status: overtimeRequests.status,
        reviewedBy: overtimeRequests.reviewedBy,
        reviewedAt: overtimeRequests.reviewedAt,
        reviewerComment: overtimeRequests.reviewerComment,
        overtimeRate: overtimeRequests.overtimeRate,
        compOffEligible: overtimeRequests.compOffEligible,
        createdAt: overtimeRequests.createdAt,
      })
      .from(overtimeRequests)
      .innerJoin(users, eq(overtimeRequests.employeeId, users.id))
      .where(and(...conditions))
      .orderBy(desc(overtimeRequests.createdAt));

    const data = rows.map((r) =>
      this.toDto({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
      }),
    );

    return { data, total: data.length };
  }

  async handleRequest(
    orgId: string,
    managerId: string,
    requestId: string,
    body: { action: string; comment?: string },
  ) {
    const { action, comment } = body;

    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestException('Action must be "approve" or "reject"');
    }

    const [request] = await this.db
      .select()
      .from(overtimeRequests)
      .where(
        and(
          eq(overtimeRequests.id, requestId),
          eq(overtimeRequests.orgId, orgId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    // Verify the request belongs to a team member
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamMemberIds.includes(request.employeeId)) {
      throw new BadRequestException('This overtime request does not belong to your team');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await this.db
      .update(overtimeRequests)
      .set({
        status: newStatus,
        reviewedBy: managerId,
        reviewedAt: new Date(),
        reviewerComment: comment ?? null,
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequests.id, requestId));

    return {
      message: `Overtime request ${action === 'approve' ? 'approved' : 'rejected'}`,
      id: requestId,
      status: newStatus,
    };
  }

  async bulkAction(
    orgId: string,
    managerId: string,
    body: { requestIds: string[]; action: string; comment?: string },
  ) {
    const { requestIds, action, comment } = body;

    if (!requestIds || requestIds.length === 0) {
      throw new BadRequestException('At least one requestId is required');
    }
    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestException('Action must be "approve" or "reject"');
    }

    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    const teamSet = new Set(teamMemberIds);

    // Fetch all requests
    const requests = await this.db
      .select()
      .from(overtimeRequests)
      .where(
        and(
          eq(overtimeRequests.orgId, orgId),
          inArray(overtimeRequests.id, requestIds),
        ),
      );

    // Validate all belong to team
    const invalidRequests = requests.filter((r) => !teamSet.has(r.employeeId));
    if (invalidRequests.length > 0) {
      throw new BadRequestException(
        `Some requests do not belong to your team members`,
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await this.db
      .update(overtimeRequests)
      .set({
        status: newStatus,
        reviewedBy: managerId,
        reviewedAt: new Date(),
        reviewerComment: comment ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(overtimeRequests.orgId, orgId),
          inArray(overtimeRequests.id, requestIds),
        ),
      );

    return {
      message: `${requestIds.length} overtime request(s) ${action === 'approve' ? 'approved' : 'rejected'}`,
      processed: requestIds.length,
      status: newStatus,
    };
  }

  async getOvertimeSummary(
    orgId: string,
    managerId: string,
    month: string,
    year: string,
  ) {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return { month: monthNum, year: yearNum, data: [] };
    }

    // Get team member names
    const teamMembers = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.id, teamMemberIds));

    const nameMap = new Map<string, string>();
    for (const m of teamMembers) {
      nameMap.set(m.userId, `${m.firstName} ${m.lastName ?? ''}`.trim());
    }

    // Get OT requests for the period
    const rows = await this.db
      .select({
        employeeId: overtimeRequests.employeeId,
        status: overtimeRequests.status,
        estimatedHours: overtimeRequests.estimatedHours,
        actualHours: overtimeRequests.actualHours,
      })
      .from(overtimeRequests)
      .where(
        and(
          eq(overtimeRequests.orgId, orgId),
          inArray(overtimeRequests.employeeId, teamMemberIds),
          gte(overtimeRequests.date, startDate),
          lte(overtimeRequests.date, endDate),
        ),
      );

    // Aggregate per employee
    const summaryMap = new Map<
      string,
      { totalOTHours: number; approvedHours: number; pendingHours: number }
    >();

    for (const r of rows) {
      if (!summaryMap.has(r.employeeId)) {
        summaryMap.set(r.employeeId, { totalOTHours: 0, approvedHours: 0, pendingHours: 0 });
      }
      const s = summaryMap.get(r.employeeId)!;
      const hours = r.actualHours ?? r.estimatedHours ?? 0;
      s.totalOTHours += hours;
      if (r.status === 'approved') {
        s.approvedHours += hours;
      } else if (r.status === 'pending') {
        s.pendingHours += hours;
      }
    }

    const data = teamMemberIds.map((empId) => {
      const s = summaryMap.get(empId) ?? { totalOTHours: 0, approvedHours: 0, pendingHours: 0 };
      return {
        employeeId: empId,
        employeeName: nameMap.get(empId) ?? 'Unknown',
        ...s,
      };
    });

    return { month: monthNum, year: yearNum, data };
  }

  async getOvertimeTrends(
    orgId: string,
    managerId: string,
    months: number,
  ) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return { months, trends: [] };
    }

    // Calculate date range from N months ago to now
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    const rows = await this.db
      .select({
        date: overtimeRequests.date,
        status: overtimeRequests.status,
        estimatedHours: overtimeRequests.estimatedHours,
        actualHours: overtimeRequests.actualHours,
      })
      .from(overtimeRequests)
      .where(
        and(
          eq(overtimeRequests.orgId, orgId),
          inArray(overtimeRequests.employeeId, teamMemberIds),
          gte(overtimeRequests.date, startStr),
          lte(overtimeRequests.date, endStr),
        ),
      );

    // Group by month
    const monthlyMap = new Map<string, { totalHours: number; approvedHours: number; requestCount: number }>();
    for (const r of rows) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { totalHours: 0, approvedHours: 0, requestCount: 0 });
      }
      const m = monthlyMap.get(key)!;
      const hours = r.actualHours ?? r.estimatedHours ?? 0;
      m.totalHours += hours;
      if (r.status === 'approved') {
        m.approvedHours += hours;
      }
      m.requestCount++;
    }

    // Build sorted trend list
    const trends = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    return { months, trends };
  }
}
