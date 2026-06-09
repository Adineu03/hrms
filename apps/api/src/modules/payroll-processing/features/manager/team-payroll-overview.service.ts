import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamPayrollOverviewService {
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

  // Resolve the run for a period, falling back to the most recent active run.
  private async resolveRun(orgId: string, month: number, year: number) {
    const exact = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(
        and(
          eq(schema.payrollRuns.orgId, orgId),
          eq(schema.payrollRuns.month, month),
          eq(schema.payrollRuns.year, year),
          eq(schema.payrollRuns.isActive, true),
        ),
      )
      .limit(1);

    if (exact.length) return exact[0];

    const [latest] = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)))
      .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
      .limit(1);

    return latest ?? null;
  }

  async getTeamSalarySummary(orgId: string, managerId: string, month?: number, year?: number) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return {
        data: {
          teamSize: 0,
          totalGross: '0',
          totalDeductions: '0',
          totalNet: '0',
          averageGross: '0',
        },
      };
    }

    // Resolve a run for the requested month, falling back to the latest run
    // so the overview populates even when the UI requests the current month
    // (which may have no run yet).
    const now = new Date();
    const targetMonth = month ?? (now.getMonth() + 1);
    const targetYear = year ?? now.getFullYear();

    const run = await this.resolveRun(orgId, targetMonth, targetYear);

    if (!run) {
      return {
        data: {
          teamSize: teamMemberIds.length,
          headcount: teamMemberIds.length,
          month: targetMonth,
          year: targetYear,
          totalGross: '0',
          totalCost: '0',
          totalDeductions: '0',
          totalNet: '0',
          averageGross: '0',
          averageCost: '0',
          overtimeCost: '0',
          pendingItems: 0,
          status: 'no_run',
        },
      };
    }

    // Get entries for team members only
    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(
        and(
          eq(schema.payrollEntries.payrollRunId, run.id),
          eq(schema.payrollEntries.orgId, orgId),
          eq(schema.payrollEntries.isActive, true),
          inArray(schema.payrollEntries.employeeId, teamMemberIds),
        ),
      );

    const totalGross = entries.reduce((sum, e) => sum + parseFloat(e.grossEarnings ?? '0'), 0);
    const totalDeductions = entries.reduce((sum, e) => sum + parseFloat(e.totalDeductions ?? '0'), 0);
    const totalNet = entries.reduce((sum, e) => sum + parseFloat(e.netPay ?? '0'), 0);

    // Pending approval items (reimbursements + overtime) from the team
    const [pendingReimb, pendingOt] = await Promise.all([
      this.db
        .select({ id: schema.reimbursementClaims.id })
        .from(schema.reimbursementClaims)
        .where(
          and(
            eq(schema.reimbursementClaims.orgId, orgId),
            eq(schema.reimbursementClaims.status, 'pending'),
            eq(schema.reimbursementClaims.isActive, true),
            inArray(schema.reimbursementClaims.employeeId, teamMemberIds),
          ),
        ),
      this.db
        .select({ id: schema.overtimeRequests.id })
        .from(schema.overtimeRequests)
        .where(
          and(
            eq(schema.overtimeRequests.orgId, orgId),
            eq(schema.overtimeRequests.status, 'pending'),
            inArray(schema.overtimeRequests.employeeId, teamMemberIds),
          ),
        ),
    ]);

    return {
      data: {
        teamSize: teamMemberIds.length,
        headcount: teamMemberIds.length,
        employeesInPayroll: entries.length,
        month: run.month,
        year: run.year,
        totalGross: totalGross.toFixed(2),
        totalCost: totalGross.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNet: totalNet.toFixed(2),
        averageGross: entries.length > 0 ? (totalGross / entries.length).toFixed(2) : '0',
        averageCost: entries.length > 0 ? (totalGross / entries.length).toFixed(2) : '0',
        overtimeCost: '0',
        pendingItems: pendingReimb.length + pendingOt.length,
      },
    };
  }

  async getHeadcountCostAnalysis(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // All active runs, most recent first, then build a month-over-month trend.
    const runs = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)))
      .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
      .limit(12);

    // Chronological order so "change" compares against the prior month.
    const ordered = [...runs].reverse();
    const trend: {
      id: string;
      month: string;
      year: number;
      totalCost: number;
      headcount: number;
      overtimeCost: number;
      change: number;
    }[] = [];

    let prevCost = 0;
    for (const run of ordered) {
      const entries = await this.db
        .select()
        .from(schema.payrollEntries)
        .where(
          and(
            eq(schema.payrollEntries.payrollRunId, run.id),
            eq(schema.payrollEntries.orgId, orgId),
            eq(schema.payrollEntries.isActive, true),
            inArray(schema.payrollEntries.employeeId, teamMemberIds),
          ),
        );

      const totalCost = entries.reduce((sum, e) => sum + parseFloat(e.grossEarnings ?? '0'), 0);
      const change = prevCost > 0 ? ((totalCost - prevCost) / prevCost) * 100 : 0;

      trend.push({
        id: run.id,
        month: MONTHS[run.month - 1] ?? String(run.month),
        year: run.year,
        totalCost,
        headcount: entries.length,
        overtimeCost: 0,
        change: Number(change.toFixed(1)),
      });

      prevCost = totalCost;
    }

    // Return most-recent first for display.
    return { data: trend.reverse(), meta: { total: trend.length } };
  }

  async getOvertimeCost(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0, totalOvertimeCost: '0' } };
    }

    // Get approved overtime requests
    const overtimeRequests = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.status, 'approved'),
          inArray(schema.overtimeRequests.employeeId, teamMemberIds),
        ),
      )
      .orderBy(desc(schema.overtimeRequests.createdAt))
      .limit(50);

    // Estimate overtime cost based on actual hours (no pay amount stored in schema)
    const totalOvertimeHours = overtimeRequests.reduce(
      (sum, o) => sum + (o.actualHours ?? o.estimatedHours ?? 0),
      0,
    );

    return {
      data: overtimeRequests,
      meta: { total: overtimeRequests.length, totalOvertimeHours },
    };
  }

  async getPayrollQueries(orgId: string, managerId: string) {
    // Get self-service requests related to payroll from team members
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    const queries = await this.db
      .select()
      .from(schema.selfServiceRequests)
      .where(
        and(
          eq(schema.selfServiceRequests.orgId, orgId),
          inArray(schema.selfServiceRequests.employeeId, teamMemberIds),
          inArray(schema.selfServiceRequests.type, ['salary_certificate', 'bank_change']),
        ),
      )
      .orderBy(desc(schema.selfServiceRequests.createdAt))
      .limit(50);

    return { data: queries, meta: { total: queries.length } };
  }
}
