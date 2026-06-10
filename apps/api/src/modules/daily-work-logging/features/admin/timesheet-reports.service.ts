import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

const round = (n: number, decimals = 2): number => {
  const f = 10 ** decimals;
  return Math.round((Number(n) || 0) * f) / f;
};

const num = (v: unknown): number => Number(v) || 0;

@Injectable()
export class TimesheetReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Window helpers ────────────────────────────────────────────────────────
  // House pattern "current-period fallback": when no explicit dates are given,
  // anchor the window at the latest date that actually has timesheet data
  // (the seed stops in the past relative to the real clock).

  private async getLatestEntryDate(orgId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ latest: sql<string | null>`MAX(${schema.timesheetEntries.date})` })
      .from(schema.timesheetEntries)
      .where(eq(schema.timesheetEntries.orgId, orgId));
    return row?.latest ?? null;
  }

  private async resolveWindow(
    orgId: string,
    filters: { startDate?: string; endDate?: string },
    spanDays = 30,
  ): Promise<{ startDate: string; endDate: string }> {
    const today = new Date().toISOString().split('T')[0];
    let endDate = filters.endDate;
    if (!endDate) {
      const latest = await this.getLatestEntryDate(orgId);
      endDate = latest ?? today;
    }
    let startDate = filters.startDate;
    if (!startDate) {
      const d = new Date(`${endDate}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (spanDays - 1));
      startDate = d.toISOString().split('T')[0];
    }
    return { startDate, endDate };
  }

  /** Number of Mon–Fri days in [startDate, endDate] inclusive. */
  private countWeekdays(startDate: string, endDate: string): number {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return 0;
    }
    let count = 0;
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const day = d.getUTCDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  }

  // ── Utilization (per employee: logged vs expected 8h/weekday) ────────────
  async getUtilization(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string; projectId?: string },
  ) {
    const { startDate, endDate } = await this.resolveWindow(orgId, filters);

    const rows = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COUNT(DISTINCT te.date) AS days_logged
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      JOIN timesheet_entries te ON te.employee_id = u.id AND te.org_id = u.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
        ${filters.projectId ? sql`AND te.project_id = ${filters.projectId}` : sql``}
      WHERE u.org_id = ${orgId}
        AND u.is_active = true
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_hours DESC
    `);

    const expectedHours = this.countWeekdays(startDate, endDate) * 8;

    return (rows as unknown as any[]).map((r) => {
      const totalHours = num(r.total_hours);
      const billableHours = num(r.billable_hours);
      return {
        employeeId: r.employee_id,
        employeeName: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Unknown',
        totalHours: round(totalHours),
        billableHours: round(billableHours),
        nonBillableHours: round(totalHours - billableHours),
        daysLogged: num(r.days_logged),
        utilization: expectedHours > 0 ? round((totalHours / expectedHours) * 100, 1) : 0,
      };
    });
  }

  // ── Project Allocation (budget vs actual per project) ────────────────────
  async getProjectAllocation(
    orgId: string,
    filters: { startDate?: string; endDate?: string; projectId?: string },
  ) {
    const { startDate, endDate } = await this.resolveWindow(orgId, filters);

    const rows = await this.db.execute(sql`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        CAST(p.budget_hours AS numeric) AS budget_hours,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS actual_hours
      FROM projects p
      LEFT JOIN timesheet_entries te ON te.project_id = p.id AND te.org_id = p.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
      WHERE p.org_id = ${orgId}
        AND p.is_active = true
        ${filters.projectId ? sql`AND p.id = ${filters.projectId}` : sql``}
      GROUP BY p.id, p.name, p.budget_hours
      ORDER BY actual_hours DESC
    `);

    return (rows as unknown as any[]).map((r) => {
      const budgetHours = num(r.budget_hours);
      const actualHours = num(r.actual_hours);
      return {
        projectId: r.project_id,
        projectName: r.project_name ?? 'Unknown project',
        budgetHours: round(budgetHours),
        actualHours: round(actualHours),
        variance: round(budgetHours - actualHours),
        percentUsed: budgetHours > 0 ? round((actualHours / budgetHours) * 100, 1) : 0,
      };
    });
  }

  // ── Productivity (org-wide metrics object — never null) ──────────────────
  async getProductivity(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const { startDate, endDate } = await this.resolveWindow(orgId, filters);

    const entryRows = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT te.employee_id) AS active_employees,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COUNT(DISTINCT (te.employee_id, te.date)) AS person_days
      FROM timesheet_entries te
      LEFT JOIN employee_profiles ep ON ep.user_id = te.employee_id AND ep.org_id = te.org_id
      WHERE te.org_id = ${orgId}
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
    `);

    const submissionRows = await this.db.execute(sql`
      SELECT
        COUNT(*) AS total_submissions,
        COUNT(*) FILTER (
          WHERE ts.submitted_at IS NOT NULL
            AND ts.submitted_at <= (ts.period_end::timestamp + INTERVAL '3 days')
        ) AS on_time_submissions
      FROM timesheet_submissions ts
      WHERE ts.org_id = ${orgId}
        AND ts.period_start >= ${startDate}
        AND ts.period_end <= ${endDate}
    `);

    const m = (entryRows as unknown as any[])[0] ?? {};
    const s = (submissionRows as unknown as any[])[0] ?? {};

    const totalHours = num(m.total_hours);
    const billableHours = num(m.billable_hours);
    const totalEmployees = num(m.active_employees);
    const personDays = num(m.person_days);
    const expectedHoursPerEmployee = this.countWeekdays(startDate, endDate) * 8;
    const totalSubmissions = num(s.total_submissions);
    const onTimeSubmissions = num(s.on_time_submissions);

    return {
      period: { startDate, endDate },
      avgHoursPerDay: personDays > 0 ? round(totalHours / personDays, 1) : 0,
      avgBillableRatio: totalHours > 0 ? round((billableHours / totalHours) * 100, 1) : 0,
      totalEmployees,
      totalHoursThisMonth: round(totalHours),
      avgUtilization:
        totalEmployees > 0 && expectedHoursPerEmployee > 0
          ? round((totalHours / (totalEmployees * expectedHoursPerEmployee)) * 100, 1)
          : 0,
      onTimeSubmissionRate:
        totalSubmissions > 0 ? round((onTimeSubmissions / totalSubmissions) * 100, 1) : 0,
    };
  }

  // ── Compliance (per employee: logged/submitted vs missing weekdays) ──────
  async getCompliance(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const { startDate, endDate } = await this.resolveWindow(orgId, filters);
    const expectedDays = this.countWeekdays(startDate, endDate);

    const rows = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT te.date) AS days_logged,
        COUNT(DISTINCT te.date) FILTER (WHERE te.status != 'draft') AS submitted_days,
        COUNT(DISTINCT te.date) FILTER (WHERE te.status = 'draft') AS draft_days
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      JOIN timesheet_entries te ON te.employee_id = u.id AND te.org_id = u.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
      WHERE u.org_id = ${orgId}
        AND u.is_active = true
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY u.first_name, u.last_name
    `);

    return (rows as unknown as any[]).map((r) => {
      const daysLogged = num(r.days_logged);
      const submittedOnTime = num(r.submitted_days);
      return {
        employeeId: r.employee_id,
        employeeName: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Unknown',
        submittedOnTime,
        totalSubmissions: daysLogged,
        lateCount: num(r.draft_days),
        missingCount: Math.max(0, expectedDays - daysLogged),
        onTimeRate: expectedDays > 0 ? round((submittedOnTime / expectedDays) * 100, 1) : 0,
      };
    });
  }

  // ── Trends (weekly totals over the seeded window) ─────────────────────────
  async getTrends(
    orgId: string,
    filters: { startDate?: string; endDate?: string; groupBy?: string; departmentId?: string },
  ) {
    const { startDate, endDate } = await this.resolveWindow(orgId, filters, 90);
    const groupBy = filters.groupBy ?? 'weekly';

    const dateGroupExpr =
      groupBy === 'monthly'
        ? sql`DATE_TRUNC('month', te.date::date)`
        : sql`DATE_TRUNC('week', te.date::date)`;
    const labelExpr =
      groupBy === 'monthly'
        ? sql`TO_CHAR(DATE_TRUNC('month', te.date::date), 'Mon YYYY')`
        : sql`TO_CHAR(DATE_TRUNC('week', te.date::date), 'Mon DD, YYYY')`;

    const rows = await this.db.execute(sql`
      SELECT
        ${labelExpr} AS period_label,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COUNT(DISTINCT te.employee_id) AS active_employees
      FROM timesheet_entries te
      LEFT JOIN employee_profiles ep ON ep.user_id = te.employee_id AND ep.org_id = te.org_id
      WHERE te.org_id = ${orgId}
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY ${dateGroupExpr}, ${labelExpr}
      ORDER BY ${dateGroupExpr} ASC
    `);

    return (rows as unknown as any[]).map((r) => {
      const totalHours = num(r.total_hours);
      const billableHours = num(r.billable_hours);
      const activeEmployees = num(r.active_employees);
      return {
        week: groupBy === 'monthly' ? `${r.period_label}` : `Week of ${r.period_label}`,
        totalHours: round(totalHours),
        billableHours: round(billableHours),
        avgPerEmployee: activeEmployees > 0 ? round(totalHours / activeEmployees, 1) : 0,
      };
    });
  }
}
