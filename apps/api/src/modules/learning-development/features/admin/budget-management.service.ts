import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class BudgetManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listBudgets(orgId: string, filters: { departmentId?: string; fiscalYear?: string; type?: string }) {
    const conditions: any[] = [
      eq(schema.learningBudgets.orgId, orgId),
      eq(schema.learningBudgets.isActive, true),
    ];
    if (filters.departmentId) conditions.push(eq(schema.learningBudgets.departmentId, filters.departmentId));
    if (filters.fiscalYear) conditions.push(eq(schema.learningBudgets.fiscalYear, filters.fiscalYear));
    if (filters.type) conditions.push(eq(schema.learningBudgets.type, filters.type));

    const rows = await this.db
      .select()
      .from(schema.learningBudgets)
      .where(and(...conditions))
      .orderBy(desc(schema.learningBudgets.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createBudget(orgId: string, data: Record<string, any>) {
    const totalBudget = data.totalBudget?.toString() ?? '0';
    const allocatedAmount = data.allocatedAmount?.toString() ?? '0';
    const spentAmount = data.spentAmount?.toString() ?? '0';
    const remaining = (Number(totalBudget) - Number(spentAmount)).toString();

    const [created] = await this.db
      .insert(schema.learningBudgets)
      .values({
        orgId,
        type: data.type ?? 'department',
        departmentId: data.departmentId ?? null,
        employeeId: data.employeeId ?? null,
        fiscalYear: data.fiscalYear,
        totalBudget,
        allocatedAmount,
        spentAmount,
        remainingAmount: remaining,
        currency: data.currency ?? 'INR',
        rolloverEnabled: data.rolloverEnabled ?? false,
        rolloverAmount: data.rolloverAmount?.toString() ?? '0',
        spendHistory: data.spendHistory ?? [],
        approvalConfig: data.approvalConfig ?? {},
        status: data.status ?? 'active',
        notes: data.notes ?? null,
        metadata: data.metadata ?? {},
      })
      .returning();

    return created;
  }

  async getBudget(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.learningBudgets)
      .where(
        and(
          eq(schema.learningBudgets.id, id),
          eq(schema.learningBudgets.orgId, orgId),
          eq(schema.learningBudgets.isActive, true),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Budget not found');
    return row;
  }

  async updateBudget(orgId: string, id: string, data: Record<string, any>) {
    await this.getBudget(orgId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = [
      'type', 'departmentId', 'employeeId', 'fiscalYear', 'currency',
      'rolloverEnabled', 'rolloverAmount', 'approvalConfig', 'status', 'notes', 'metadata',
    ];
    for (const f of fields) {
      if (data[f] !== undefined) updates[f] = data[f];
    }
    if (data.totalBudget !== undefined) updates.totalBudget = data.totalBudget.toString();
    if (data.allocatedAmount !== undefined) updates.allocatedAmount = data.allocatedAmount.toString();
    if (data.spentAmount !== undefined) updates.spentAmount = data.spentAmount.toString();
    if (data.totalBudget !== undefined || data.spentAmount !== undefined) {
      const budget = await this.getBudget(orgId, id);
      const total = Number(updates.totalBudget ?? budget.totalBudget);
      const spent = Number(updates.spentAmount ?? budget.spentAmount);
      updates.remainingAmount = (total - spent).toString();
    }
    if (data.rolloverAmount !== undefined) updates.rolloverAmount = data.rolloverAmount.toString();

    await this.db
      .update(schema.learningBudgets)
      .set(updates)
      .where(and(eq(schema.learningBudgets.id, id), eq(schema.learningBudgets.orgId, orgId)));

    return this.getBudget(orgId, id);
  }

  async deleteBudget(orgId: string, id: string) {
    await this.getBudget(orgId, id);
    await this.db
      .update(schema.learningBudgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.learningBudgets.id, id), eq(schema.learningBudgets.orgId, orgId)));

    return { success: true, message: 'Budget deleted' };
  }

  async getBudgetSummary(orgId: string, fiscalYear?: string) {
    const conditions: any[] = [
      eq(schema.learningBudgets.orgId, orgId),
      eq(schema.learningBudgets.isActive, true),
    ];
    if (fiscalYear) conditions.push(eq(schema.learningBudgets.fiscalYear, fiscalYear));

    const budgets = await this.db
      .select()
      .from(schema.learningBudgets)
      .where(and(...conditions));

    const departments = await this.db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));

    const deptNames: Record<string, string> = {};
    for (const d of departments) deptNames[d.id] = d.name;

    let totalBudget = 0;
    let totalSpent = 0;
    let totalAllocated = 0;
    const byDepartment: Record<string, { departmentName: string; totalBudget: number; spent: number; remaining: number }> = {};

    for (const b of budgets) {
      const budget = Number(b.totalBudget);
      const spent = Number(b.spentAmount);
      const allocated = Number(b.allocatedAmount);
      totalBudget += budget;
      totalSpent += spent;
      totalAllocated += allocated;

      if (b.departmentId) {
        if (!byDepartment[b.departmentId]) {
          byDepartment[b.departmentId] = {
            departmentName: deptNames[b.departmentId] ?? 'Unknown',
            totalBudget: 0,
            spent: 0,
            remaining: 0,
          };
        }
        byDepartment[b.departmentId].totalBudget += budget;
        byDepartment[b.departmentId].spent += spent;
        byDepartment[b.departmentId].remaining += Number(b.remainingAmount);
      }
    }

    return {
      totalBudget,
      totalSpent,
      totalAllocated,
      totalRemaining: totalBudget - totalSpent,
      utilizationRate: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      byDepartment: Object.entries(byDepartment).map(([id, v]) => ({ departmentId: id, ...v })),
      totalBudgetRecords: budgets.length,
    };
  }
}
