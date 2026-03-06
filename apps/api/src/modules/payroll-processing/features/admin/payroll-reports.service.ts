import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PayrollReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPayrollSummary(orgId: string, month: number, year: number) {
    // Get the payroll run for the period
    const runs = await this.db
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

    if (!runs.length) {
      return {
        data: {
          month,
          year,
          totalEmployees: 0,
          totalGross: '0',
          totalDeductions: '0',
          totalNet: '0',
          status: 'no_run',
        },
      };
    }

    const run = runs[0];

    // Get breakdown of earnings and deductions
    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(
        and(
          eq(schema.payrollEntries.payrollRunId, run.id),
          eq(schema.payrollEntries.orgId, orgId),
          eq(schema.payrollEntries.isActive, true),
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
        acc.otherDeductions += parseFloat(e.otherDeductions ?? '0');
        return acc;
      },
      {
        basicSalary: 0,
        hra: 0,
        da: 0,
        specialAllowance: 0,
        otherEarnings: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        ptDeduction: 0,
        incomeTax: 0,
        otherDeductions: 0,
      },
    );

    return {
      data: {
        month,
        year,
        status: run.status,
        totalEmployees: run.totalEmployees,
        totalGross: run.totalGrossPay,
        totalDeductions: run.totalDeductions,
        totalNet: run.totalNetPay,
        earningsBreakdown: {
          basicSalary: totals.basicSalary.toFixed(2),
          hra: totals.hra.toFixed(2),
          da: totals.da.toFixed(2),
          specialAllowance: totals.specialAllowance.toFixed(2),
          otherEarnings: totals.otherEarnings.toFixed(2),
        },
        deductionsBreakdown: {
          pfDeduction: totals.pfDeduction.toFixed(2),
          esiDeduction: totals.esiDeduction.toFixed(2),
          ptDeduction: totals.ptDeduction.toFixed(2),
          incomeTax: totals.incomeTax.toFixed(2),
          otherDeductions: totals.otherDeductions.toFixed(2),
        },
      },
    };
  }

  async getDepartmentBreakdown(orgId: string, month: number, year: number) {
    // Get the run
    const runs = await this.db
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

    if (!runs.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get entries for the run
    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(
        and(
          eq(schema.payrollEntries.payrollRunId, runs[0].id),
          eq(schema.payrollEntries.orgId, orgId),
          eq(schema.payrollEntries.isActive, true),
        ),
      );

    // Get employee profiles for department mapping
    const employeeIds = entries.map((e) => e.employeeId);
    const profiles = employeeIds.length
      ? await this.db
          .select({ userId: schema.employeeProfiles.userId, departmentId: schema.employeeProfiles.departmentId })
          .from(schema.employeeProfiles)
          .where(and(eq(schema.employeeProfiles.orgId, orgId), sql`${schema.employeeProfiles.userId} = ANY(${employeeIds})`))
      : [];

    const empDeptMap = new Map(profiles.map((p) => [p.userId, p.departmentId]));

    // Get departments for name mapping
    const departments = await this.db
      .select({ id: schema.departments.id, name: schema.departments.name })
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));

    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    // Aggregate by department
    const deptAgg = new Map<string, { headcount: number; gross: number; deductions: number; net: number }>();

    for (const entry of entries) {
      const deptId = empDeptMap.get(entry.employeeId) ?? 'unassigned';
      const existing = deptAgg.get(deptId) ?? { headcount: 0, gross: 0, deductions: 0, net: 0 };
      existing.headcount += 1;
      existing.gross += parseFloat(entry.grossEarnings ?? '0');
      existing.deductions += parseFloat(entry.totalDeductions ?? '0');
      existing.net += parseFloat(entry.netPay ?? '0');
      deptAgg.set(deptId, existing);
    }

    const data = Array.from(deptAgg.entries()).map(([deptId, agg]) => ({
      departmentId: deptId,
      departmentName: deptId === 'unassigned' ? 'Unassigned' : deptMap.get(deptId) ?? 'Unknown',
      headcount: agg.headcount,
      totalGross: agg.gross.toFixed(2),
      totalDeductions: agg.deductions.toFixed(2),
      totalNet: agg.net.toFixed(2),
    }));

    return { data, meta: { total: data.length } };
  }

  async getSalaryRegister(orgId: string, month: number, year: number) {
    const runs = await this.db
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

    if (!runs.length) {
      return { data: [], meta: { total: 0 } };
    }

    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(
        and(
          eq(schema.payrollEntries.payrollRunId, runs[0].id),
          eq(schema.payrollEntries.orgId, orgId),
          eq(schema.payrollEntries.isActive, true),
        ),
      );

    // Enrich with employee names
    const employeeIds = entries.map((e) => e.employeeId);
    const users = employeeIds.length
      ? await this.db
          .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName, email: schema.users.email })
          .from(schema.users)
          .where(sql`${schema.users.id} = ANY(${employeeIds})`)
      : [];

    const userMap = new Map(users.map((u) => [u.id, { name: `${u.firstName} ${u.lastName ?? ''}`.trim(), email: u.email }]));

    const data = entries.map((entry) => {
      const user = userMap.get(entry.employeeId);
      return {
        employeeId: entry.employeeId,
        employeeName: user?.name ?? 'Unknown',
        employeeEmail: user?.email ?? '',
        basicSalary: entry.basicSalary,
        hra: entry.hra,
        da: entry.da,
        specialAllowance: entry.specialAllowance,
        otherEarnings: entry.otherEarnings,
        grossEarnings: entry.grossEarnings,
        pfDeduction: entry.pfDeduction,
        esiDeduction: entry.esiDeduction,
        ptDeduction: entry.ptDeduction,
        incomeTax: entry.incomeTax,
        otherDeductions: entry.otherDeductions,
        totalDeductions: entry.totalDeductions,
        netPay: entry.netPay,
        lossOfPayDays: entry.lossOfPayDays,
      };
    });

    return { data, meta: { total: data.length } };
  }

  async getVarianceAnalysis(orgId: string, month: number, year: number) {
    // Get current and previous month's runs
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const [currentRun] = await this.db
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

    const [previousRun] = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(
        and(
          eq(schema.payrollRuns.orgId, orgId),
          eq(schema.payrollRuns.month, prevMonth),
          eq(schema.payrollRuns.year, prevYear),
          eq(schema.payrollRuns.isActive, true),
        ),
      )
      .limit(1);

    const currentGross = parseFloat(currentRun?.totalGrossPay ?? '0');
    const previousGross = parseFloat(previousRun?.totalGrossPay ?? '0');
    const currentNet = parseFloat(currentRun?.totalNetPay ?? '0');
    const previousNet = parseFloat(previousRun?.totalNetPay ?? '0');
    const currentDeductions = parseFloat(currentRun?.totalDeductions ?? '0');
    const previousDeductions = parseFloat(previousRun?.totalDeductions ?? '0');

    const grossVariance = currentGross - previousGross;
    const netVariance = currentNet - previousNet;
    const deductionVariance = currentDeductions - previousDeductions;

    return {
      data: {
        currentPeriod: { month, year },
        previousPeriod: { month: prevMonth, year: prevYear },
        current: {
          totalEmployees: currentRun?.totalEmployees ?? 0,
          totalGross: currentGross.toFixed(2),
          totalDeductions: currentDeductions.toFixed(2),
          totalNet: currentNet.toFixed(2),
        },
        previous: {
          totalEmployees: previousRun?.totalEmployees ?? 0,
          totalGross: previousGross.toFixed(2),
          totalDeductions: previousDeductions.toFixed(2),
          totalNet: previousNet.toFixed(2),
        },
        variance: {
          grossChange: grossVariance.toFixed(2),
          grossChangePercent: previousGross > 0 ? ((grossVariance / previousGross) * 100).toFixed(2) : '0',
          netChange: netVariance.toFixed(2),
          netChangePercent: previousNet > 0 ? ((netVariance / previousNet) * 100).toFixed(2) : '0',
          deductionChange: deductionVariance.toFixed(2),
          headcountChange: (currentRun?.totalEmployees ?? 0) - (previousRun?.totalEmployees ?? 0),
        },
      },
    };
  }

  async getComplianceReport(orgId: string) {
    // Get all filings grouped by type and status
    const filings = await this.db
      .select({
        type: schema.statutoryFilings.type,
        status: schema.statutoryFilings.status,
        count: sql<number>`count(*)`,
      })
      .from(schema.statutoryFilings)
      .where(and(eq(schema.statutoryFilings.orgId, orgId), eq(schema.statutoryFilings.isActive, true)))
      .groupBy(schema.statutoryFilings.type, schema.statutoryFilings.status);

    // Organize into a useful summary
    const byType = new Map<string, { total: number; pending: number; filed: number; overdue: number }>();

    for (const filing of filings) {
      const existing = byType.get(filing.type) ?? { total: 0, pending: 0, filed: 0, overdue: 0 };
      const count = Number(filing.count);
      existing.total += count;
      if (filing.status === 'pending') existing.pending += count;
      if (filing.status === 'filed' || filing.status === 'completed') existing.filed += count;
      if (filing.status === 'overdue') existing.overdue += count;
      byType.set(filing.type, existing);
    }

    const data = Array.from(byType.entries()).map(([type, summary]) => ({
      type,
      ...summary,
      complianceRate: summary.total > 0 ? Math.round((summary.filed / summary.total) * 100) : 0,
    }));

    return { data, meta: { total: data.length } };
  }

  async getYearEndReconciliation(orgId: string, year: number) {
    // Get all payroll runs for the year
    const runs = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(
        and(
          eq(schema.payrollRuns.orgId, orgId),
          eq(schema.payrollRuns.year, year),
          eq(schema.payrollRuns.isActive, true),
        ),
      )
      .orderBy(schema.payrollRuns.month);

    const monthlyData = runs.map((run) => ({
      month: run.month,
      totalEmployees: run.totalEmployees,
      totalGross: run.totalGrossPay,
      totalDeductions: run.totalDeductions,
      totalNet: run.totalNetPay,
      status: run.status,
    }));

    const annualTotals = runs.reduce(
      (acc, run) => {
        acc.totalGross += parseFloat(run.totalGrossPay ?? '0');
        acc.totalDeductions += parseFloat(run.totalDeductions ?? '0');
        acc.totalNet += parseFloat(run.totalNetPay ?? '0');
        return acc;
      },
      { totalGross: 0, totalDeductions: 0, totalNet: 0 },
    );

    // Get statutory filing totals for the year
    const filingTotals = await this.db
      .select({
        type: schema.statutoryFilings.type,
        totalAmount: sql<string>`sum(${schema.statutoryFilings.amount})`,
      })
      .from(schema.statutoryFilings)
      .where(
        and(
          eq(schema.statutoryFilings.orgId, orgId),
          eq(schema.statutoryFilings.isActive, true),
          sql`${schema.statutoryFilings.period} LIKE ${year + '%'}`,
        ),
      )
      .groupBy(schema.statutoryFilings.type);

    return {
      data: {
        year,
        monthlyData,
        annualTotals: {
          totalGross: annualTotals.totalGross.toFixed(2),
          totalDeductions: annualTotals.totalDeductions.toFixed(2),
          totalNet: annualTotals.totalNet.toFixed(2),
          processedMonths: runs.length,
        },
        statutoryTotals: filingTotals.map((f) => ({
          type: f.type,
          totalAmount: f.totalAmount ?? '0',
        })),
      },
    };
  }
}
