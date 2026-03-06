import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyExpensesService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listReports(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.employeeId, userId),
          eq(schema.expenseReports.isActive, true),
        ),
      )
      .orderBy(desc(schema.expenseReports.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createReport(orgId: string, userId: string, dto: { title: string; description?: string }) {
    const [row] = await this.db
      .insert(schema.expenseReports)
      .values({
        orgId,
        employeeId: userId,
        title: dto.title,
        description: dto.description ?? null,
        totalAmount: '0',
        status: 'draft',
      })
      .returning();

    return { data: row };
  }

  async getReportDetail(orgId: string, userId: string, id: string) {
    const rows = await this.db
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

  async updateReport(orgId: string, userId: string, id: string, dto: { title?: string; description?: string }) {
    const existing = await this.db
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

    if (!existing.length) throw new NotFoundException('Expense report not found');
    if (existing[0].status !== 'draft') {
      throw new BadRequestException('Only draft reports can be updated');
    }

    const [row] = await this.db
      .update(schema.expenseReports)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async submitReport(orgId: string, userId: string, id: string) {
    const existing = await this.db
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

    if (!existing.length) throw new NotFoundException('Expense report not found');
    if (existing[0].status !== 'draft') {
      throw new BadRequestException('Only draft reports can be submitted');
    }

    // Verify at least one item exists
    const items = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.reportId, id), eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)));

    if (!items.length) {
      throw new BadRequestException('Cannot submit a report with no expense items');
    }

    const [row] = await this.db
      .update(schema.expenseReports)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseReports.id, id), eq(schema.expenseReports.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async addItem(
    orgId: string,
    userId: string,
    reportId: string,
    dto: {
      categoryId?: string;
      date: string;
      amount: string;
      vendor?: string;
      description: string;
      receiptUrl?: string;
      receiptName?: string;
    },
  ) {
    // Verify the report belongs to this user and is a draft
    const report = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.id, reportId),
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.employeeId, userId),
          eq(schema.expenseReports.isActive, true),
        ),
      );

    if (!report.length) throw new NotFoundException('Expense report not found');
    if (report[0].status !== 'draft') {
      throw new BadRequestException('Items can only be added to draft reports');
    }

    const [item] = await this.db
      .insert(schema.expenseItems)
      .values({
        orgId,
        reportId,
        categoryId: dto.categoryId ?? null,
        date: new Date(dto.date),
        amount: dto.amount,
        vendor: dto.vendor ?? null,
        description: dto.description,
        receiptUrl: dto.receiptUrl ?? null,
        receiptName: dto.receiptName ?? null,
      })
      .returning();

    // Recalculate report total
    const allItems = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.reportId, reportId), eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)));

    const total = allItems.reduce((sum, i) => sum + parseFloat(i.amount ?? '0'), 0);

    await this.db
      .update(schema.expenseReports)
      .set({ totalAmount: total.toFixed(2), updatedAt: new Date() })
      .where(and(eq(schema.expenseReports.id, reportId), eq(schema.expenseReports.orgId, orgId)));

    return { data: item };
  }

  async updateItem(
    orgId: string,
    userId: string,
    reportId: string,
    itemId: string,
    dto: {
      categoryId?: string;
      date?: string;
      amount?: string;
      vendor?: string;
      description?: string;
      receiptUrl?: string;
      receiptName?: string;
    },
  ) {
    // Verify the report belongs to this user and is a draft
    const report = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.id, reportId),
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.employeeId, userId),
          eq(schema.expenseReports.isActive, true),
        ),
      );

    if (!report.length) throw new NotFoundException('Expense report not found');
    if (report[0].status !== 'draft') {
      throw new BadRequestException('Items can only be updated in draft reports');
    }

    const existing = await this.db
      .select()
      .from(schema.expenseItems)
      .where(
        and(
          eq(schema.expenseItems.id, itemId),
          eq(schema.expenseItems.reportId, reportId),
          eq(schema.expenseItems.orgId, orgId),
          eq(schema.expenseItems.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Expense item not found');

    const [item] = await this.db
      .update(schema.expenseItems)
      .set({
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.vendor !== undefined && { vendor: dto.vendor }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
        ...(dto.receiptName !== undefined && { receiptName: dto.receiptName }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseItems.id, itemId), eq(schema.expenseItems.orgId, orgId)))
      .returning();

    // Recalculate report total
    const allItems = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.reportId, reportId), eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)));

    const total = allItems.reduce((sum, i) => sum + parseFloat(i.amount ?? '0'), 0);

    await this.db
      .update(schema.expenseReports)
      .set({ totalAmount: total.toFixed(2), updatedAt: new Date() })
      .where(and(eq(schema.expenseReports.id, reportId), eq(schema.expenseReports.orgId, orgId)));

    return { data: item };
  }

  async removeItem(orgId: string, userId: string, reportId: string, itemId: string) {
    // Verify the report belongs to this user and is a draft
    const report = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.id, reportId),
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.employeeId, userId),
          eq(schema.expenseReports.isActive, true),
        ),
      );

    if (!report.length) throw new NotFoundException('Expense report not found');
    if (report[0].status !== 'draft') {
      throw new BadRequestException('Items can only be removed from draft reports');
    }

    const existing = await this.db
      .select()
      .from(schema.expenseItems)
      .where(
        and(
          eq(schema.expenseItems.id, itemId),
          eq(schema.expenseItems.reportId, reportId),
          eq(schema.expenseItems.orgId, orgId),
          eq(schema.expenseItems.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Expense item not found');

    const [item] = await this.db
      .update(schema.expenseItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.expenseItems.id, itemId), eq(schema.expenseItems.orgId, orgId)))
      .returning();

    // Recalculate report total
    const allItems = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.reportId, reportId), eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)));

    const total = allItems.reduce((sum, i) => sum + parseFloat(i.amount ?? '0'), 0);

    await this.db
      .update(schema.expenseReports)
      .set({ totalAmount: total.toFixed(2), updatedAt: new Date() })
      .where(and(eq(schema.expenseReports.id, reportId), eq(schema.expenseReports.orgId, orgId)));

    return { data: item };
  }
}
