import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamCostReportsService {
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

  async getCostBreakdown(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { breakdown: [], totalCost: '0' }, meta: { total: 0 } };
    }

    // Get latest payroll run
    const [latestRun] = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)))
      .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
      .limit(1);

    if (!latestRun) {
      return { data: { breakdown: [], totalCost: '0', period: null }, meta: { total: 0 } };
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

    const totals = entries.reduce(
      (acc, e) => {
        acc.basicSalary += parseFloat(e.basicSalary ?? '0');
        acc.hra += parseFloat(e.hra ?? '0');
        acc.da += parseFloat(e.da ?? '0');
        acc.specialAllowance += parseFloat(e.specialAllowance ?? '0');
        acc.otherEarnings += parseFloat(e.otherEarnings ?? '0');
        acc.pfDeduction += parseFloat(e.pfDeduction ?? '0');
        acc.esiDeduction += parseFloat(e.esiDeduction ?? '0');
        acc.ptDeduction += parseFloat(e.ptDeduction ?? '0');
        acc.incomeTax += parseFloat(e.incomeTax ?? '0');
        return acc;
      },
      { basicSalary: 0, hra: 0, da: 0, specialAllowance: 0, otherEarnings: 0, pfDeduction: 0, esiDeduction: 0, ptDeduction: 0, incomeTax: 0 },
    );

    const totalCost = totals.basicSalary + totals.hra + totals.da + totals.specialAllowance + totals.otherEarnings;

    return {
      data: {
        period: { month: latestRun.month, year: latestRun.year },
        teamSize: entries.length,
        breakdown: [
          { component: 'Basic Salary', amount: totals.basicSalary.toFixed(2), percentage: totalCost > 0 ? ((totals.basicSalary / totalCost) * 100).toFixed(1) : '0' },
          { component: 'HRA', amount: totals.hra.toFixed(2), percentage: totalCost > 0 ? ((totals.hra / totalCost) * 100).toFixed(1) : '0' },
          { component: 'DA', amount: totals.da.toFixed(2), percentage: totalCost > 0 ? ((totals.da / totalCost) * 100).toFixed(1) : '0' },
          { component: 'Special Allowance', amount: totals.specialAllowance.toFixed(2), percentage: totalCost > 0 ? ((totals.specialAllowance / totalCost) * 100).toFixed(1) : '0' },
          { component: 'Other Earnings', amount: totals.otherEarnings.toFixed(2), percentage: totalCost > 0 ? ((totals.otherEarnings / totalCost) * 100).toFixed(1) : '0' },
        ],
        deductionBreakdown: [
          { component: 'PF', amount: totals.pfDeduction.toFixed(2) },
          { component: 'ESI', amount: totals.esiDeduction.toFixed(2) },
          { component: 'PT', amount: totals.ptDeduction.toFixed(2) },
          { component: 'Income Tax', amount: totals.incomeTax.toFixed(2) },
        ],
        totalCost: totalCost.toFixed(2),
      },
    };
  }

  async getBudgetVsActual(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    // Return a mock budget comparison — actual budget data would come from a budgets table
    // Here we calculate actuals from payroll entries and show comparison structure
    const now = new Date();

    const runs = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(
        and(
          eq(schema.payrollRuns.orgId, orgId),
          eq(schema.payrollRuns.year, now.getFullYear()),
          eq(schema.payrollRuns.isActive, true),
        ),
      )
      .orderBy(schema.payrollRuns.month);

    let ytdActual = 0;
    const monthlyData = [];

    for (const run of runs) {
      const entries = await this.db
        .select()
        .from(schema.payrollEntries)
        .where(
          and(
            eq(schema.payrollEntries.payrollRunId, run.id),
            eq(schema.payrollEntries.orgId, orgId),
            eq(schema.payrollEntries.isActive, true),
            sql`${schema.payrollEntries.employeeId} = ANY(${teamMemberIds})`,
          ),
        );

      const monthlyActual = entries.reduce((sum, e) => sum + parseFloat(e.grossEarnings ?? '0'), 0);
      ytdActual += monthlyActual;

      monthlyData.push({
        month: run.month,
        actual: monthlyActual.toFixed(2),
      });
    }

    return {
      data: {
        year: now.getFullYear(),
        teamSize: teamMemberIds.length,
        ytdActual: ytdActual.toFixed(2),
        monthlyData,
        note: 'Budget data requires configuration. Showing actuals only.',
      },
    };
  }

  async getCostProjections(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { currentMonthly: '0', projected3m: '0', projected6m: '0', projected12m: '0' } };
    }

    // Get latest payroll data to project from
    const [latestRun] = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)))
      .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
      .limit(1);

    if (!latestRun) {
      return { data: { currentMonthly: '0', projected3m: '0', projected6m: '0', projected12m: '0' } };
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

    const currentMonthly = entries.reduce((sum, e) => sum + parseFloat(e.grossEarnings ?? '0'), 0);

    return {
      data: {
        basedOn: { month: latestRun.month, year: latestRun.year },
        currentMonthly: currentMonthly.toFixed(2),
        projected3m: (currentMonthly * 3).toFixed(2),
        projected6m: (currentMonthly * 6).toFixed(2),
        projected12m: (currentMonthly * 12).toFixed(2),
        teamSize: entries.length,
      },
    };
  }

  async getLeaveImpact(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { totalLopDays: 0, estimatedDeduction: '0', affectedEmployees: 0 } };
    }

    // Get latest payroll entries to check LOP
    const [latestRun] = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)))
      .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
      .limit(1);

    if (!latestRun) {
      return { data: { totalLopDays: 0, estimatedDeduction: '0', affectedEmployees: 0, period: null } };
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

    const lopEntries = entries.filter((e) => e.lossOfPayDays > 0);
    const totalLopDays = lopEntries.reduce((sum, e) => sum + e.lossOfPayDays, 0);

    // Estimate deduction: average daily salary * LOP days
    const totalBasic = entries.reduce((sum, e) => sum + parseFloat(e.basicSalary ?? '0'), 0);
    const avgDailySalary = entries.length > 0 ? totalBasic / (entries.length * 30) : 0;
    const estimatedDeduction = avgDailySalary * totalLopDays;

    return {
      data: {
        period: { month: latestRun.month, year: latestRun.year },
        totalLopDays,
        affectedEmployees: lopEntries.length,
        estimatedDeduction: estimatedDeduction.toFixed(2),
        teamSize: entries.length,
      },
    };
  }
}
