import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ExpenseAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSummary(orgId: string) {
    // Get all active reports
    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(eq(schema.expenseReports.orgId, orgId), eq(schema.expenseReports.isActive, true)));

    // Totals by status
    const statusTotals = new Map<string, { count: number; amount: number }>();
    for (const report of reports) {
      const existing = statusTotals.get(report.status) ?? { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += parseFloat(report.totalAmount ?? '0');
      statusTotals.set(report.status, existing);
    }

    const byStatus = Array.from(statusTotals.entries()).map(([status, totals]) => ({
      status,
      count: totals.count,
      totalAmount: totals.amount.toFixed(2),
    }));

    // Category breakdown
    const items = await this.db
      .select()
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)));

    const categories = await this.db
      .select()
      .from(schema.expenseCategories)
      .where(and(eq(schema.expenseCategories.orgId, orgId), eq(schema.expenseCategories.isActive, true)));

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const categoryTotals = new Map<string, { count: number; amount: number }>();
    for (const item of items) {
      const catId = item.categoryId ?? 'uncategorized';
      const existing = categoryTotals.get(catId) ?? { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += parseFloat(item.amount ?? '0');
      categoryTotals.set(catId, existing);
    }

    const byCategory = Array.from(categoryTotals.entries()).map(([catId, totals]) => ({
      categoryId: catId,
      categoryName: catId === 'uncategorized' ? 'Uncategorized' : categoryMap.get(catId) ?? 'Unknown',
      count: totals.count,
      totalAmount: totals.amount.toFixed(2),
    }));

    const overallTotal = reports.reduce((sum, r) => sum + parseFloat(r.totalAmount ?? '0'), 0);

    return {
      data: {
        totalReports: reports.length,
        overallTotal: overallTotal.toFixed(2),
        byStatus,
        byCategory,
      },
    };
  }

  async getDepartmentBreakdown(orgId: string) {
    // Get all reports with employee department mapping
    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(and(eq(schema.expenseReports.orgId, orgId), eq(schema.expenseReports.isActive, true)));

    const employeeIds = [...new Set(reports.map((r) => r.employeeId))];

    const profiles = employeeIds.length
      ? await this.db
          .select({ userId: schema.employeeProfiles.userId, departmentId: schema.employeeProfiles.departmentId })
          .from(schema.employeeProfiles)
          .where(and(eq(schema.employeeProfiles.orgId, orgId), sql`${schema.employeeProfiles.userId} = ANY(${employeeIds})`))
      : [];

    const empDeptMap = new Map(profiles.map((p) => [p.userId, p.departmentId]));

    const departments = await this.db
      .select({ id: schema.departments.id, name: schema.departments.name })
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));

    const deptNameMap = new Map(departments.map((d) => [d.id, d.name]));

    const deptAgg = new Map<string, { count: number; totalAmount: number; employees: Set<string> }>();

    for (const report of reports) {
      const deptId = empDeptMap.get(report.employeeId) ?? 'unassigned';
      const existing = deptAgg.get(deptId) ?? { count: 0, totalAmount: 0, employees: new Set() };
      existing.count += 1;
      existing.totalAmount += parseFloat(report.totalAmount ?? '0');
      existing.employees.add(report.employeeId);
      deptAgg.set(deptId, existing);
    }

    const data = Array.from(deptAgg.entries()).map(([deptId, agg]) => ({
      departmentId: deptId,
      departmentName: deptId === 'unassigned' ? 'Unassigned' : deptNameMap.get(deptId) ?? 'Unknown',
      reportCount: agg.count,
      totalAmount: agg.totalAmount.toFixed(2),
      uniqueEmployees: agg.employees.size,
    }));

    return { data, meta: { total: data.length } };
  }

  async getTrends(orgId: string, monthsBack: number) {
    // Get reports from the last N months
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.createdAt} >= ${cutoffDate}`,
        ),
      )
      .orderBy(schema.expenseReports.createdAt);

    // Aggregate by month
    const monthlyAgg = new Map<string, { count: number; totalAmount: number }>();

    for (const report of reports) {
      const date = new Date(report.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyAgg.get(key) ?? { count: 0, totalAmount: 0 };
      existing.count += 1;
      existing.totalAmount += parseFloat(report.totalAmount ?? '0');
      monthlyAgg.set(key, existing);
    }

    const data = Array.from(monthlyAgg.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, agg]) => ({
        period,
        reportCount: agg.count,
        totalAmount: agg.totalAmount.toFixed(2),
      }));

    return { data, meta: { total: data.length } };
  }

  async getPolicyViolations(orgId: string) {
    // Get all active policies
    const policies = await this.db
      .select()
      .from(schema.expensePolicies)
      .where(and(eq(schema.expensePolicies.orgId, orgId), eq(schema.expensePolicies.isActive, true)));

    // Get submitted/approved reports with their items
    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.status} IN ('submitted', 'under_review', 'approved')`,
        ),
      );

    const violations: Array<{
      reportId: string;
      reportTitle: string;
      employeeId: string;
      totalAmount: string;
      violationType: string;
      policyName: string;
      limit: string;
    }> = [];

    // Check each report against per-claim limits
    for (const policy of policies) {
      if (!policy.maxAmountPerClaim) continue;

      const maxPerClaim = parseFloat(policy.maxAmountPerClaim);

      for (const report of reports) {
        const reportAmount = parseFloat(report.totalAmount ?? '0');
        if (reportAmount > maxPerClaim) {
          violations.push({
            reportId: report.id,
            reportTitle: report.title,
            employeeId: report.employeeId,
            totalAmount: report.totalAmount,
            violationType: 'exceeds_per_claim_limit',
            policyName: policy.name,
            limit: policy.maxAmountPerClaim,
          });
        }
      }
    }

    return { data: violations, meta: { total: violations.length } };
  }
}
