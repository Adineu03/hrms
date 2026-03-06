import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
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

    // Get the latest run or a specific month
    const now = new Date();
    const targetMonth = month ?? (now.getMonth() + 1);
    const targetYear = year ?? now.getFullYear();

    const runs = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(
        and(
          eq(schema.payrollRuns.orgId, orgId),
          eq(schema.payrollRuns.month, targetMonth),
          eq(schema.payrollRuns.year, targetYear),
          eq(schema.payrollRuns.isActive, true),
        ),
      )
      .limit(1);

    if (!runs.length) {
      return {
        data: {
          teamSize: teamMemberIds.length,
          month: targetMonth,
          year: targetYear,
          totalGross: '0',
          totalDeductions: '0',
          totalNet: '0',
          averageGross: '0',
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
          eq(schema.payrollEntries.payrollRunId, runs[0].id),
          eq(schema.payrollEntries.orgId, orgId),
          eq(schema.payrollEntries.isActive, true),
          sql`${schema.payrollEntries.employeeId} = ANY(${teamMemberIds})`,
        ),
      );

    const totalGross = entries.reduce((sum, e) => sum + parseFloat(e.grossEarnings ?? '0'), 0);
    const totalDeductions = entries.reduce((sum, e) => sum + parseFloat(e.totalDeductions ?? '0'), 0);
    const totalNet = entries.reduce((sum, e) => sum + parseFloat(e.netPay ?? '0'), 0);

    return {
      data: {
        teamSize: teamMemberIds.length,
        employeesInPayroll: entries.length,
        month: targetMonth,
        year: targetYear,
        totalGross: totalGross.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNet: totalNet.toFixed(2),
        averageGross: entries.length > 0 ? (totalGross / entries.length).toFixed(2) : '0',
      },
    };
  }

  async getHeadcountCostAnalysis(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { headcount: 0, monthlyCost: '0', annualProjection: '0', costPerEmployee: '0' } };
    }

    // Get latest payroll run
    const [latestRun] = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)))
      .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
      .limit(1);

    if (!latestRun) {
      return {
        data: {
          headcount: teamMemberIds.length,
          monthlyCost: '0',
          annualProjection: '0',
          costPerEmployee: '0',
        },
      };
    }

    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(
        and(
          eq(schema.payrollEntries.payrollRunId, latestRun.id),
          eq(schema.payrollEntries.orgId, orgId),
          eq(schema.payrollEntries.isActive, true),
          sql`${schema.payrollEntries.employeeId} = ANY(${teamMemberIds})`,
        ),
      );

    const totalCost = entries.reduce((sum, e) => sum + parseFloat(e.grossEarnings ?? '0'), 0);
    const annualProjection = totalCost * 12;

    return {
      data: {
        headcount: teamMemberIds.length,
        monthlyCost: totalCost.toFixed(2),
        annualProjection: annualProjection.toFixed(2),
        costPerEmployee: teamMemberIds.length > 0 ? (totalCost / teamMemberIds.length).toFixed(2) : '0',
        basedOnPeriod: { month: latestRun.month, year: latestRun.year },
      },
    };
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
          sql`${schema.overtimeRequests.employeeId} = ANY(${teamMemberIds})`,
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
          sql`${schema.selfServiceRequests.employeeId} = ANY(${teamMemberIds})`,
          sql`${schema.selfServiceRequests.type} IN ('salary_certificate', 'bank_change')`,
        ),
      )
      .orderBy(desc(schema.selfServiceRequests.createdAt))
      .limit(50);

    return { data: queries, meta: { total: queries.length } };
  }
}
