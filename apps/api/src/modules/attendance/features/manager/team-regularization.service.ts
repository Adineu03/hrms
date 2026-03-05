import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sql, gte, lte, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { attendanceRegularizations } from '../../../../infrastructure/database/schema/attendance-regularizations';

@Injectable()
export class TeamRegularizationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private toDto(row: Record<string, any>) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      date: row.date,
      punchType: row.punchType,
      requestedTime: row.requestedTime,
      reason: row.reason,
      reasonCode: row.reasonCode,
      evidence: row.evidence,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      reviewerComment: row.reviewerComment,
      slaDeadline: row.slaDeadline,
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
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return { data: [], total: 0, page: filters.page ?? 1, limit: filters.limit ?? 20 };
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(attendanceRegularizations.orgId, orgId),
      inArray(attendanceRegularizations.employeeId, teamMemberIds),
    ];

    if (filters.status) {
      conditions.push(eq(attendanceRegularizations.status, filters.status));
    }

    // Get total count
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRegularizations)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Get paginated results
    const rows = await this.db
      .select({
        id: attendanceRegularizations.id,
        employeeId: attendanceRegularizations.employeeId,
        firstName: users.firstName,
        lastName: users.lastName,
        date: attendanceRegularizations.date,
        punchType: attendanceRegularizations.punchType,
        requestedTime: attendanceRegularizations.requestedTime,
        reason: attendanceRegularizations.reason,
        reasonCode: attendanceRegularizations.reasonCode,
        evidence: attendanceRegularizations.evidence,
        status: attendanceRegularizations.status,
        reviewedBy: attendanceRegularizations.reviewedBy,
        reviewedAt: attendanceRegularizations.reviewedAt,
        reviewerComment: attendanceRegularizations.reviewerComment,
        slaDeadline: attendanceRegularizations.slaDeadline,
        createdAt: attendanceRegularizations.createdAt,
      })
      .from(attendanceRegularizations)
      .innerJoin(users, eq(attendanceRegularizations.employeeId, users.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRegularizations.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) =>
      this.toDto({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
      }),
    );

    return { data, total, page, limit };
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
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.id, requestId),
          eq(attendanceRegularizations.orgId, orgId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Regularization request not found');
    }

    // Verify the request belongs to a team member
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamMemberIds.includes(request.employeeId)) {
      throw new BadRequestException('This regularization request does not belong to your team');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await this.db
      .update(attendanceRegularizations)
      .set({
        status: newStatus,
        reviewedBy: managerId,
        reviewedAt: new Date(),
        reviewerComment: comment ?? null,
        updatedAt: new Date(),
      })
      .where(eq(attendanceRegularizations.id, requestId));

    return {
      message: `Regularization request ${action === 'approve' ? 'approved' : 'rejected'}`,
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

    // Fetch all requests to validate ownership
    const requests = await this.db
      .select()
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.orgId, orgId),
          inArray(attendanceRegularizations.id, requestIds),
        ),
      );

    const invalidRequests = requests.filter((r) => !teamSet.has(r.employeeId));
    if (invalidRequests.length > 0) {
      throw new BadRequestException(
        'Some regularization requests do not belong to your team members',
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await this.db
      .update(attendanceRegularizations)
      .set({
        status: newStatus,
        reviewedBy: managerId,
        reviewedAt: new Date(),
        reviewerComment: comment ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceRegularizations.orgId, orgId),
          inArray(attendanceRegularizations.id, requestIds),
        ),
      );

    return {
      message: `${requestIds.length} regularization request(s) ${action === 'approve' ? 'approved' : 'rejected'}`,
      processed: requestIds.length,
      status: newStatus,
    };
  }

  async getHistory(
    orgId: string,
    managerId: string,
    filters: { employeeId?: string; startDate?: string; endDate?: string },
  ) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return { data: [] };
    }

    const conditions: any[] = [
      eq(attendanceRegularizations.orgId, orgId),
    ];

    // If a specific employeeId is provided, verify they belong to the team
    if (filters.employeeId) {
      if (!teamMemberIds.includes(filters.employeeId)) {
        throw new BadRequestException('Employee is not in your team');
      }
      conditions.push(eq(attendanceRegularizations.employeeId, filters.employeeId));
    } else {
      conditions.push(inArray(attendanceRegularizations.employeeId, teamMemberIds));
    }

    if (filters.startDate) {
      conditions.push(gte(attendanceRegularizations.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(attendanceRegularizations.date, filters.endDate));
    }

    const rows = await this.db
      .select({
        id: attendanceRegularizations.id,
        employeeId: attendanceRegularizations.employeeId,
        firstName: users.firstName,
        lastName: users.lastName,
        date: attendanceRegularizations.date,
        punchType: attendanceRegularizations.punchType,
        requestedTime: attendanceRegularizations.requestedTime,
        reason: attendanceRegularizations.reason,
        reasonCode: attendanceRegularizations.reasonCode,
        evidence: attendanceRegularizations.evidence,
        status: attendanceRegularizations.status,
        reviewedBy: attendanceRegularizations.reviewedBy,
        reviewedAt: attendanceRegularizations.reviewedAt,
        reviewerComment: attendanceRegularizations.reviewerComment,
        slaDeadline: attendanceRegularizations.slaDeadline,
        createdAt: attendanceRegularizations.createdAt,
      })
      .from(attendanceRegularizations)
      .innerJoin(users, eq(attendanceRegularizations.employeeId, users.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRegularizations.createdAt));

    const data = rows.map((r) =>
      this.toDto({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
      }),
    );

    return { data };
  }
}
