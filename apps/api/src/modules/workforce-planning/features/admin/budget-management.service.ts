import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class BudgetManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listBudgets(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceBudgets)
      .where(and(eq(schema.workforceBudgets.orgId, orgId), eq(schema.workforceBudgets.isActive, true)))
      .orderBy(desc(schema.workforceBudgets.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createBudget(
    orgId: string,
    dto: {
      budgetName: string;
      budgetYear: number;
      departmentId?: string;
      costCenter?: string;
      allocatedAmount: number;
      currency?: string;
      notes?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.workforceBudgets)
      .values({
        orgId,
        budgetName: dto.budgetName,
        budgetYear: dto.budgetYear,
        departmentId: dto.departmentId ?? null,
        costCenter: dto.costCenter ?? null,
        allocatedAmount: String(dto.allocatedAmount),
        currency: dto.currency ?? 'INR',
        notes: dto.notes ?? null,
      })
      .returning();

    return { data: row };
  }

  async getBudget(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceBudgets)
      .where(and(eq(schema.workforceBudgets.id, id), eq(schema.workforceBudgets.orgId, orgId), eq(schema.workforceBudgets.isActive, true)));

    if (!rows.length) throw new NotFoundException('Workforce budget not found');

    return { data: rows[0] };
  }

  async updateBudget(
    orgId: string,
    id: string,
    dto: {
      actualSpend?: number;
      projectedSpend?: number;
      salaryIncreasePool?: number;
      benefitsCostProjected?: number;
      fteCount?: number;
      status?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.workforceBudgets)
      .where(and(eq(schema.workforceBudgets.id, id), eq(schema.workforceBudgets.orgId, orgId), eq(schema.workforceBudgets.isActive, true)));

    if (!existing.length) throw new NotFoundException('Workforce budget not found');

    const [row] = await this.db
      .update(schema.workforceBudgets)
      .set({
        ...(dto.actualSpend !== undefined && { actualSpend: String(dto.actualSpend) }),
        ...(dto.projectedSpend !== undefined && { projectedSpend: String(dto.projectedSpend) }),
        ...(dto.salaryIncreasePool !== undefined && { salaryIncreasePool: String(dto.salaryIncreasePool) }),
        ...(dto.benefitsCostProjected !== undefined && { benefitsCostProjected: String(dto.benefitsCostProjected) }),
        ...(dto.fteCount !== undefined && { fteCount: dto.fteCount }),
        ...(dto.status !== undefined && { status: dto.status }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.workforceBudgets.id, id), eq(schema.workforceBudgets.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteBudget(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.workforceBudgets)
      .where(and(eq(schema.workforceBudgets.id, id), eq(schema.workforceBudgets.orgId, orgId), eq(schema.workforceBudgets.isActive, true)));

    if (!existing.length) throw new NotFoundException('Workforce budget not found');

    const [row] = await this.db
      .update(schema.workforceBudgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.workforceBudgets.id, id), eq(schema.workforceBudgets.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async approveBudget(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.workforceBudgets)
      .where(and(eq(schema.workforceBudgets.id, id), eq(schema.workforceBudgets.orgId, orgId), eq(schema.workforceBudgets.isActive, true)));

    if (!existing.length) throw new NotFoundException('Workforce budget not found');

    const [row] = await this.db
      .update(schema.workforceBudgets)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.workforceBudgets.id, id), eq(schema.workforceBudgets.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
