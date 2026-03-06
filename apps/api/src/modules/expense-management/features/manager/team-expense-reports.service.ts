import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamExpenseReportsService {
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

  async getTeamSpendingAnalysis(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return {
        data: {
          teamSize: 0,
          totalSpend: '0',
          averagePerEmployee: '0',
          approvedTotal: '0',
          reimbursedTotal: '0',
        },
      };
    }

    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.employeeId} = ANY(${teamMemberIds})`,
        ),
      );

    const totalSpend = reports.reduce((sum, r) => sum + parseFloat(r.totalAmount ?? '0'), 0);
    const approvedTotal = reports
      .filter((r) => r.status === 'approved' || r.status === 'reimbursed')
      .reduce((sum, r) => sum + parseFloat(r.totalAmount ?? '0'), 0);
    const reimbursedTotal = reports
      .filter((r) => r.status === 'reimbursed')
      .reduce((sum, r) => sum + parseFloat(r.totalAmount ?? '0'), 0);

    return {
      data: {
        teamSize: teamMemberIds.length,
        totalReports: reports.length,
        totalSpend: totalSpend.toFixed(2),
        averagePerEmployee: teamMemberIds.length > 0 ? (totalSpend / teamMemberIds.length).toFixed(2) : '0',
        approvedTotal: approvedTotal.toFixed(2),
        reimbursedTotal: reimbursedTotal.toFixed(2),
      },
    };
  }

  async getCategoryBreakdown(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get report IDs for team members
    const reports = await this.db
      .select({ id: schema.expenseReports.id })
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.employeeId} = ANY(${teamMemberIds})`,
        ),
      );

    const reportIds = reports.map((r) => r.id);

    if (!reportIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get items for these reports
    const items = await this.db
      .select()
      .from(schema.expenseItems)
      .where(
        and(
          eq(schema.expenseItems.orgId, orgId),
          eq(schema.expenseItems.isActive, true),
          sql`${schema.expenseItems.reportId} = ANY(${reportIds})`,
        ),
      );

    // Get category names
    const categories = await this.db
      .select()
      .from(schema.expenseCategories)
      .where(and(eq(schema.expenseCategories.orgId, orgId), eq(schema.expenseCategories.isActive, true)));

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Aggregate by category
    const categoryAgg = new Map<string, { count: number; totalAmount: number }>();

    for (const item of items) {
      const catId = item.categoryId ?? 'uncategorized';
      const existing = categoryAgg.get(catId) ?? { count: 0, totalAmount: 0 };
      existing.count += 1;
      existing.totalAmount += parseFloat(item.amount ?? '0');
      categoryAgg.set(catId, existing);
    }

    const data = Array.from(categoryAgg.entries()).map(([catId, agg]) => ({
      categoryId: catId,
      categoryName: catId === 'uncategorized' ? 'Uncategorized' : categoryMap.get(catId) ?? 'Unknown',
      itemCount: agg.count,
      totalAmount: agg.totalAmount.toFixed(2),
    }));

    return { data, meta: { total: data.length } };
  }

  async getTopSpenders(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get user details
    const users = await this.db
      .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName, email: schema.users.email })
      .from(schema.users)
      .where(sql`${schema.users.id} = ANY(${teamMemberIds})`);

    const userMap = new Map(users.map((u) => [u.id, { name: `${u.firstName} ${u.lastName ?? ''}`.trim(), email: u.email }]));

    // Get reports
    const reports = await this.db
      .select()
      .from(schema.expenseReports)
      .where(
        and(
          eq(schema.expenseReports.orgId, orgId),
          eq(schema.expenseReports.isActive, true),
          sql`${schema.expenseReports.employeeId} = ANY(${teamMemberIds})`,
        ),
      );

    // Aggregate by employee
    const empAgg = new Map<string, { totalAmount: number; reportCount: number }>();

    for (const report of reports) {
      const existing = empAgg.get(report.employeeId) ?? { totalAmount: 0, reportCount: 0 };
      existing.totalAmount += parseFloat(report.totalAmount ?? '0');
      existing.reportCount += 1;
      empAgg.set(report.employeeId, existing);
    }

    const data = Array.from(empAgg.entries())
      .map(([empId, agg]) => {
        const user = userMap.get(empId);
        return {
          employeeId: empId,
          employeeName: user?.name ?? 'Unknown',
          employeeEmail: user?.email ?? '',
          totalAmount: agg.totalAmount.toFixed(2),
          reportCount: agg.reportCount,
        };
      })
      .sort((a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount))
      .slice(0, 10);

    return { data, meta: { total: data.length } };
  }
}
