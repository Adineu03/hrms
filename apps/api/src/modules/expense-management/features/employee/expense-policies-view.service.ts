import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ExpensePoliciesViewService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listApplicablePolicies(orgId: string, userId: string) {
    // Get the employee's profile to know their role/grade/department
    const profiles = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.userId, userId)))
      .limit(1);

    const profile = profiles[0];
    const employeeDeptId = profile?.departmentId ?? null;

    // Get user role
    const users = await this.db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const userRole = users[0]?.role ?? 'employee';

    // Get all active policies
    const allPolicies = await this.db
      .select()
      .from(schema.expensePolicies)
      .where(and(eq(schema.expensePolicies.orgId, orgId), eq(schema.expensePolicies.isActive, true)));

    // Filter to applicable policies (null = applies to all)
    const applicable = allPolicies.filter((policy) => {
      // If a role filter is set and doesn't match, skip
      if (policy.appliesToRole && policy.appliesToRole !== userRole) return false;
      // If a department filter is set and doesn't match, skip
      if (policy.appliesToDepartment && policy.appliesToDepartment !== employeeDeptId) return false;
      return true;
    });

    // Enrich with category names
    const categoryIds = [...new Set(applicable.filter((p) => p.categoryId).map((p) => p.categoryId!))];
    const categories = categoryIds.length
      ? await this.db
          .select()
          .from(schema.expenseCategories)
          .where(and(eq(schema.expenseCategories.orgId, orgId), sql`${schema.expenseCategories.id} = ANY(${categoryIds})`))
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const data = applicable.map((policy) => ({
      ...policy,
      categoryName: policy.categoryId ? categoryMap.get(policy.categoryId) ?? 'Unknown' : 'All Categories',
    }));

    return { data, meta: { total: data.length } };
  }

  async listCategories(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.expenseCategories)
      .where(and(eq(schema.expenseCategories.orgId, orgId), eq(schema.expenseCategories.isActive, true)))
      .orderBy(schema.expenseCategories.sortOrder);

    return { data: rows, meta: { total: rows.length } };
  }

  async getSpendingLimits(orgId: string, userId: string) {
    // Get applicable policies
    const policiesResult = await this.listApplicablePolicies(orgId, userId);
    const policies = policiesResult.data;

    // Get current month's expense totals
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.employeeId, userId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.status} IN ('submitted', 'under_review', 'approved', 'reimbursed')`,
          sql`${schema.expenseReports.createdAt} >= ${firstDayOfMonth}`,
        ),
      );

    const monthlySpent = reports.reduce((sum, r) => sum + parseFloat(r.totalAmount ?? '0'), 0);

    // Build limits view
    const limits = policies.map((policy) => {
      const maxPerClaim = parseFloat(policy.maxAmountPerClaim ?? '0');
      const maxPerMonth = parseFloat(policy.maxAmountPerMonth ?? '0');

      return {
        policyId: policy.id,
        policyName: policy.name,
        categoryName: (policy as any).categoryName ?? 'All Categories',
        maxAmountPerClaim: policy.maxAmountPerClaim ?? 'Unlimited',
        maxAmountPerMonth: policy.maxAmountPerMonth ?? 'Unlimited',
        requiresReceipt: policy.requiresReceipt,
        receiptMinAmount: policy.receiptMinAmount ?? '0',
        perDiemRate: policy.perDiemRate ?? null,
        monthlySpent: monthlySpent.toFixed(2),
        monthlyRemaining: maxPerMonth > 0 ? Math.max(0, maxPerMonth - monthlySpent).toFixed(2) : 'Unlimited',
      };
    });

    return {
      data: {
        currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        totalMonthlySpent: monthlySpent.toFixed(2),
        limits,
      },
    };
  }
}
