import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamExpenseOverviewService {
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

  async getTeamExpenseSummary(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return {
        data: {
          teamSize: 0,
          totalExpenses: '0',
          pendingCount: 0,
          pendingAmount: '0',
          approvedAmount: '0',
          reimbursedAmount: '0',
        },
      };
    }

    // Get all reports from team members
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

    let totalExpenses = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let reimbursedAmount = 0;

    for (const report of reports) {
      const amount = parseFloat(report.totalAmount ?? '0');
      totalExpenses += amount;

      if (report.status === 'submitted' || report.status === 'under_review') {
        pendingCount += 1;
        pendingAmount += amount;
      } else if (report.status === 'approved') {
        approvedAmount += amount;
      } else if (report.status === 'reimbursed') {
        reimbursedAmount += amount;
      }
    }

    // Monthly trend (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentReports = reports.filter((r) => new Date(r.createdAt) >= threeMonthsAgo);
    const monthlyAgg = new Map<string, number>();
    for (const report of recentReports) {
      const date = new Date(report.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyAgg.set(key, (monthlyAgg.get(key) ?? 0) + parseFloat(report.totalAmount ?? '0'));
    }

    const trends = Array.from(monthlyAgg.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, totalAmount: amount.toFixed(2) }));

    return {
      data: {
        teamSize: teamMemberIds.length,
        totalReports: reports.length,
        totalExpenses: totalExpenses.toFixed(2),
        pendingCount,
        pendingAmount: pendingAmount.toFixed(2),
        approvedAmount: approvedAmount.toFixed(2),
        reimbursedAmount: reimbursedAmount.toFixed(2),
        trends,
      },
    };
  }

  async getTeamMemberExpenses(orgId: string, managerId: string) {
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

    // Get reports grouped by employee
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

    const empAgg = new Map<string, { totalReports: number; totalAmount: number; pendingCount: number; approvedAmount: number }>();

    for (const report of reports) {
      const existing = empAgg.get(report.employeeId) ?? { totalReports: 0, totalAmount: 0, pendingCount: 0, approvedAmount: 0 };
      existing.totalReports += 1;
      existing.totalAmount += parseFloat(report.totalAmount ?? '0');
      if (report.status === 'submitted' || report.status === 'under_review') {
        existing.pendingCount += 1;
      }
      if (report.status === 'approved' || report.status === 'reimbursed') {
        existing.approvedAmount += parseFloat(report.totalAmount ?? '0');
      }
      empAgg.set(report.employeeId, existing);
    }

    const data = teamMemberIds.map((empId) => {
      const user = userMap.get(empId);
      const agg = empAgg.get(empId) ?? { totalReports: 0, totalAmount: 0, pendingCount: 0, approvedAmount: 0 };
      return {
        employeeId: empId,
        employeeName: user?.name ?? 'Unknown',
        employeeEmail: user?.email ?? '',
        totalReports: agg.totalReports,
        totalAmount: agg.totalAmount.toFixed(2),
        pendingCount: agg.pendingCount,
        approvedAmount: agg.approvedAmount.toFixed(2),
      };
    });

    return { data, meta: { total: data.length } };
  }
}
