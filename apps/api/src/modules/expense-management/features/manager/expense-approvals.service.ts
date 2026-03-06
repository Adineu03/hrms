import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ExpenseApprovalsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));
    return teamMembers.map((m) => m.userId);
  }

  async listPendingApprovals(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    const rows = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.status} IN ('submitted', 'under_review')`,
          sql`${schema.expenseReports.employeeId} = ANY(${teamMemberIds})`,
        ),
      )
      .orderBy(desc(schema.expenseReports.submittedAt));

    // Enrich with employee names
    const employeeIds = [...new Set(rows.map((r) => r.employeeId))];
    const users = employeeIds.length
      ? await this.db
          .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
          .from(schema.users)
          .where(sql`${schema.users.id} = ANY(${employeeIds})`)
      : [];

    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName ?? ''}`.trim()]));

    const data = rows.map((r) => ({
      ...r,
      employeeName: userMap.get(r.employeeId) ?? 'Unknown',
    }));

    return { data, meta: { total: data.length } };
  }

  async getReportDetail(orgId: string, managerId: string, id: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    const rows = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.id, id),
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.employeeId} = ANY(${teamMemberIds})`,
        ),
      );

    if (!rows.length) throw new NotFoundException('Expense report not found');

    // Get items
    const items = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.reportId, id), eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)))
      .orderBy(schema.expenseItems.date);

    // Get approval history
    const approvals = await this.db
      .select()
      .from(schema.expenseApprovals)
      .where(and(eq(schema.expenseApprovals.reportId, id), eq(schema.expenseApprovals.orgId, orgId), eq(schema.expenseApprovals.isActive, true)))
      .orderBy(schema.expenseApprovals.actionAt);

    return { data: { ...rows[0], items, approvals } };
  }

  async approveReport(orgId: string, id: string, approverId: string, comments?: string) {
    const report = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId), eq(schema.expenseReports.isActive, true)));

    if (!report.length) throw new NotFoundException('Expense report not found');
    if (report[0].status !== 'submitted' && report[0].status !== 'under_review') {
      throw new BadRequestException('Report is not in a state that can be approved');
    }

    await this.db.insert(schema.expenseApprovals).values({
      orgId,
      reportId: id,
      approverId,
      action: 'approved',
      comments: comments ?? null,
      level: 1,
    });

    const [row] = await this.db
      .update(schema.expenseReports)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async rejectReport(orgId: string, id: string, approverId: string, reason: string) {
    const report = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId), eq(schema.expenseReports.isActive, true)));

    if (!report.length) throw new NotFoundException('Expense report not found');
    if (report[0].status !== 'submitted' && report[0].status !== 'under_review') {
      throw new BadRequestException('Report is not in a state that can be rejected');
    }

    await this.db.insert(schema.expenseApprovals).values({
      orgId,
      reportId: id,
      approverId,
      action: 'rejected',
      comments: reason,
      level: 1,
    });

    const [row] = await this.db
      .update(schema.expenseReports)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async returnReport(orgId: string, id: string, approverId: string, comments: string) {
    const report = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId), eq(schema.expenseReports.isActive, true)));

    if (!report.length) throw new NotFoundException('Expense report not found');
    if (report[0].status !== 'submitted' && report[0].status !== 'under_review') {
      throw new BadRequestException('Report is not in a state that can be returned');
    }

    await this.db.insert(schema.expenseApprovals).values({
      orgId,
      reportId: id,
      approverId,
      action: 'returned',
      comments,
      level: 1,
    });

    // Return to draft so employee can edit and resubmit
    const [row] = await this.db
      .update(schema.expenseReports)
      .set({
        status: 'draft',
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
