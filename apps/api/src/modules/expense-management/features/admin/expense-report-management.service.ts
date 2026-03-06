import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ExpenseReportManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listReports(orgId: string, status?: string) {
    const conditions = [
      eq(schema.expenseReports.orgId, orgId),
      eq(schema.expenseReports.isActive, true),
    ];

    if (status) {
      conditions.push(eq(schema.expenseReports.status, status));
    }

    const rows = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(...conditions))
      .orderBy(desc(schema.expenseReports.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async getReportDetail(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId), eq(schema.expenseReports.isActive, true)));

    if (!rows.length) throw new NotFoundException('Expense report not found');

    // Get items for this report
    const items = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.reportId, id), eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)))
      .orderBy(schema.expenseItems.date);

    return { data: { ...rows[0], items } };
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

    // Create approval record
    await this.db.insert(schema.expenseApprovals).values({
      orgId,
      reportId: id,
      approverId,
      action: 'approved',
      comments: comments ?? null,
      level: 1,
    });

    // Update report status
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

    // Create rejection record
    await this.db.insert(schema.expenseApprovals).values({
      orgId,
      reportId: id,
      approverId,
      action: 'rejected',
      comments: reason,
      level: 1,
    });

    // Update report status
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

  async reimburseReport(orgId: string, id: string, approverId: string) {
    const report = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId), eq(schema.expenseReports.isActive, true)));

    if (!report.length) throw new NotFoundException('Expense report not found');
    if (report[0].status !== 'approved') {
      throw new BadRequestException('Only approved reports can be marked as reimbursed');
    }

    // Create reimbursement record
    await this.db.insert(schema.expenseApprovals).values({
      orgId,
      reportId: id,
      approverId,
      action: 'approved',
      comments: 'Marked as reimbursed',
      level: 2,
    });

    const [row] = await this.db
      .update(schema.expenseReports)
      .set({
        status: 'reimbursed',
        reimbursedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getAuditTrail(orgId: string, reportId: string) {
    const rows = await this.db
      .select()
      .from(schema.expenseApprovals)
      .where(and(eq(schema.expenseApprovals.reportId, reportId), eq(schema.expenseApprovals.orgId, orgId), eq(schema.expenseApprovals.isActive, true)))
      .orderBy(schema.expenseApprovals.actionAt);

    return { data: rows, meta: { total: rows.length } };
  }
}
