import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ExpensePolicyConfigurationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  // --- Categories ---

  async listCategories(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.expenseCategories)
      .where(and(eq(schema.expenseCategories.orgId, orgId), eq(schema.expenseCategories.isActive, true)))
      .orderBy(schema.expenseCategories.sortOrder);

    return { data: rows, meta: { total: rows.length } };
  }

  async createCategory(
    orgId: string,
    dto: {
      name: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
    },
  ) {
    const [row] = await this.db
      .insert(schema.expenseCategories)
      .values({
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();

    return { data: row };
  }

  async updateCategory(
    orgId: string,
    id: string,
    dto: {
      name?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.expenseCategories)
      .where(and(eq(schema.expenseCategories.id, id), eq(schema.expenseCategories.orgId, orgId), eq(schema.expenseCategories.isActive, true)));

    if (!existing.length) throw new NotFoundException('Expense category not found');

    const [row] = await this.db
      .update(schema.expenseCategories)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseCategories.id, id), eq(schema.expenseCategories.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteCategory(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.expenseCategories)
      .where(and(eq(schema.expenseCategories.id, id), eq(schema.expenseCategories.orgId, orgId), eq(schema.expenseCategories.isActive, true)));

    if (!existing.length) throw new NotFoundException('Expense category not found');

    const [row] = await this.db
      .update(schema.expenseCategories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.expenseCategories.id, id), eq(schema.expenseCategories.orgId, orgId)))
      .returning();

    return { data: row };
  }

  // --- Policies ---

  async listPolicies(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.expensePolicies)
      .where(and(eq(schema.expensePolicies.orgId, orgId), eq(schema.expensePolicies.isActive, true)))
      .orderBy(schema.expensePolicies.name);

    return { data: rows, meta: { total: rows.length } };
  }

  async createPolicy(
    orgId: string,
    dto: {
      name: string;
      categoryId?: string;
      maxAmountPerClaim?: string;
      maxAmountPerMonth?: string;
      requiresReceipt?: boolean;
      receiptMinAmount?: string;
      perDiemRate?: string;
      appliesToRole?: string;
      appliesToGrade?: string;
      appliesToDepartment?: string;
      approvalLevels?: number;
      description?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.expensePolicies)
      .values({
        orgId,
        name: dto.name,
        categoryId: dto.categoryId ?? null,
        maxAmountPerClaim: dto.maxAmountPerClaim ?? null,
        maxAmountPerMonth: dto.maxAmountPerMonth ?? null,
        requiresReceipt: dto.requiresReceipt ?? true,
        receiptMinAmount: dto.receiptMinAmount ?? '0',
        perDiemRate: dto.perDiemRate ?? null,
        appliesToRole: dto.appliesToRole ?? null,
        appliesToGrade: dto.appliesToGrade ?? null,
        appliesToDepartment: dto.appliesToDepartment ?? null,
        approvalLevels: dto.approvalLevels ?? 1,
        description: dto.description ?? null,
      })
      .returning();

    return { data: row };
  }

  async updatePolicy(
    orgId: string,
    id: string,
    dto: {
      name?: string;
      categoryId?: string;
      maxAmountPerClaim?: string;
      maxAmountPerMonth?: string;
      requiresReceipt?: boolean;
      receiptMinAmount?: string;
      perDiemRate?: string;
      appliesToRole?: string;
      appliesToGrade?: string;
      appliesToDepartment?: string;
      approvalLevels?: number;
      description?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.expensePolicies)
      .where(and(eq(schema.expensePolicies.id, id), eq(schema.expensePolicies.orgId, orgId), eq(schema.expensePolicies.isActive, true)));

    if (!existing.length) throw new NotFoundException('Expense policy not found');

    const [row] = await this.db
      .update(schema.expensePolicies)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.maxAmountPerClaim !== undefined && { maxAmountPerClaim: dto.maxAmountPerClaim }),
        ...(dto.maxAmountPerMonth !== undefined && { maxAmountPerMonth: dto.maxAmountPerMonth }),
        ...(dto.requiresReceipt !== undefined && { requiresReceipt: dto.requiresReceipt }),
        ...(dto.receiptMinAmount !== undefined && { receiptMinAmount: dto.receiptMinAmount }),
        ...(dto.perDiemRate !== undefined && { perDiemRate: dto.perDiemRate }),
        ...(dto.appliesToRole !== undefined && { appliesToRole: dto.appliesToRole }),
        ...(dto.appliesToGrade !== undefined && { appliesToGrade: dto.appliesToGrade }),
        ...(dto.appliesToDepartment !== undefined && { appliesToDepartment: dto.appliesToDepartment }),
        ...(dto.approvalLevels !== undefined && { approvalLevels: dto.approvalLevels }),
        ...(dto.description !== undefined && { description: dto.description }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expensePolicies.id, id), eq(schema.expensePolicies.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deletePolicy(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.expensePolicies)
      .where(and(eq(schema.expensePolicies.id, id), eq(schema.expensePolicies.orgId, orgId), eq(schema.expensePolicies.isActive, true)));

    if (!existing.length) throw new NotFoundException('Expense policy not found');

    const [row] = await this.db
      .update(schema.expensePolicies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.expensePolicies.id, id), eq(schema.expensePolicies.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
