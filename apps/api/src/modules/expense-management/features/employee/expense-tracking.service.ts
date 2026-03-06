import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ExpenseTrackingService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getExpenseHistory(orgId: string, userId: string, filters?: { status?: string; category?: string }) {
    const conditions = [
      eq(schema.expenseReports.orgId, orgId),
      eq(schema.expenseReports.employeeId, userId),
      eq(schema.expenseReports.isActive, true),
    ];

    if (filters?.status) {
      conditions.push(eq(schema.expenseReports.status, filters.status));
    }

    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(...conditions))
      .orderBy(desc(schema.expenseReports.createdAt));

    // If category filter is provided, filter by items with that category
    if (filters?.category) {
      const reportIds = reports.map((r) => r.id);
      if (!reportIds.length) {
        return { data: [], meta: { total: 0 } };
      }

      const items = await this.db
        .select()
        .from(schema.expenseItems)
        .where(
          and(
            eq(schema.expenseItems.orgId, orgId),
            eq(schema.expenseItems.categoryId, filters.category),
            eq(schema.expenseItems.isActive, true),
          ),
        );

      const reportIdsWithCategory = new Set(items.map((i) => i.reportId));
      const filtered = reports.filter((r) => reportIdsWithCategory.has(r.id));
      return { data: filtered, meta: { total: filtered.length } };
    }

    return { data: reports, meta: { total: reports.length } };
  }

  async getExpenseSummary(orgId: string, userId: string) {
    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.employeeId, userId),
          eq(schema.expenseReports.isActive, true),
        ),
      );

    let pendingAmount = 0;
    let approvedAmount = 0;
    let reimbursedAmount = 0;
    let rejectedAmount = 0;
    let draftCount = 0;
    let pendingCount = 0;

    for (const report of reports) {
      const amount = parseFloat(report.totalAmount ?? '0');

      switch (report.status) {
        case 'draft':
          draftCount += 1;
          break;
        case 'submitted':
        case 'under_review':
          pendingCount += 1;
          pendingAmount += amount;
          break;
        case 'approved':
          approvedAmount += amount;
          break;
        case 'reimbursed':
          reimbursedAmount += amount;
          break;
        case 'rejected':
          rejectedAmount += amount;
          break;
      }
    }

    return {
      data: {
        totalReports: reports.length,
        draftCount,
        pendingCount,
        pendingAmount: pendingAmount.toFixed(2),
        approvedAmount: approvedAmount.toFixed(2),
        reimbursedAmount: reimbursedAmount.toFixed(2),
        rejectedAmount: rejectedAmount.toFixed(2),
        totalClaimed: (pendingAmount + approvedAmount + reimbursedAmount).toFixed(2),
      },
    };
  }

  async duplicateReport(orgId: string, userId: string, id: string) {
    // Find the original report
    const original = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.id, id),
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.employeeId, userId),
          eq(schema.expenseReports.isActive, true),
        ),
      );

    if (!original.length) throw new NotFoundException('Expense report not found');
    if (original[0].status !== 'rejected') {
      throw new BadRequestException('Only rejected reports can be duplicated');
    }

    // Create new report as draft
    const [newReport] = await this.db
      .insert(schema.expenseReports)
      .values({
        orgId,
        employeeId: userId,
        title: `${original[0].title} (Resubmission)`,
        description: original[0].description,
        totalAmount: '0',
        status: 'draft',
      })
      .returning();

    // Copy items from the original report
    const originalItems = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.reportId, id), eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)));

    if (originalItems.length) {
      const itemValues = originalItems.map((item) => ({
        orgId,
        reportId: newReport.id,
        categoryId: item.categoryId,
        date: item.date,
        amount: item.amount,
        vendor: item.vendor,
        description: item.description,
        receiptUrl: item.receiptUrl,
        receiptName: item.receiptName,
      }));

      await this.db.insert(schema.expenseItems).values(itemValues);

      // Update report total
      const total = originalItems.reduce((sum, i) => sum + parseFloat(i.amount ?? '0'), 0);
      await this.db
        .update(schema.expenseReports)
        .set({ totalAmount: total.toFixed(2), updatedAt: new Date() })
        .where(and(eq(schema.expenseReports.id, newReport.id), eq(schema.expenseReports.orgId, orgId)));

      newReport.totalAmount = total.toFixed(2);
    }

    return { data: newReport };
  }
}
