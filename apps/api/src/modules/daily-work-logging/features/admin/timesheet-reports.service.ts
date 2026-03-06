import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, sql, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TimesheetReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getUtilization(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string; projectId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // Utilization by employee
    const byEmployee = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        u.email,
        d.name AS department_name,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = false THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS non_billable_hours,
        COUNT(DISTINCT te.date) AS days_logged,
        CASE WHEN COUNT(DISTINCT te.date) > 0
          THEN ROUND(COALESCE(SUM(CAST(te.hours AS numeric)), 0) / COUNT(DISTINCT te.date), 2)
          ELSE 0
        END AS avg_hours_per_day
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
      LEFT JOIN timesheet_entries te ON te.employee_id = u.id AND te.org_id = u.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
      WHERE u.org_id = ${orgId}
        AND u.is_active = true
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, u.email, d.name
      HAVING COALESCE(SUM(CAST(te.hours AS numeric)), 0) > 0
      ORDER BY total_hours DESC
    `);

    // Utilization by department
    const byDepartment = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(DISTINCT te.employee_id) AS active_employees,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        CASE WHEN COALESCE(SUM(CAST(te.hours AS numeric)), 0) > 0
          THEN ROUND(
            (COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0)
              / COALESCE(SUM(CAST(te.hours AS numeric)), 0)) * 100,
            2
          )
          ELSE 0
        END AS billable_percentage
      FROM departments d
      JOIN employee_profiles ep ON ep.department_id = d.id AND ep.org_id = d.org_id
      LEFT JOIN timesheet_entries te ON te.employee_id = ep.user_id AND te.org_id = d.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
      WHERE d.org_id = ${orgId}
      GROUP BY d.id, d.name
      ORDER BY total_hours DESC
    `);

    // Utilization by project
    const byProject = await this.db.execute(sql`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.code AS project_code,
        p.is_billable,
        COUNT(DISTINCT te.employee_id) AS employees_logged,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COUNT(DISTINCT te.date) AS active_days
      FROM projects p
      LEFT JOIN timesheet_entries te ON te.project_id = p.id AND te.org_id = p.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
      WHERE p.org_id = ${orgId}
        AND p.is_active = true
        ${filters.projectId ? sql`AND p.id = ${filters.projectId}` : sql``}
      GROUP BY p.id, p.name, p.code, p.is_billable
      ORDER BY total_hours DESC
    `);

    return {
      period: { startDate, endDate },
      byEmployee,
      byDepartment,
      byProject,
    };
  }

  async getProjectAllocation(
    orgId: string,
    filters: { startDate?: string; endDate?: string; projectId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    const allocation = await this.db.execute(sql`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.code AS project_code,
        p.client_name,
        CAST(p.budget_hours AS numeric) AS budget_hours,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS actual_hours,
        CASE WHEN CAST(p.budget_hours AS numeric) > 0
          THEN ROUND(
            (COALESCE(SUM(CAST(te.hours AS numeric)), 0) / CAST(p.budget_hours AS numeric)) * 100,
            2
          )
          ELSE 0
        END AS budget_utilization_pct,
        CASE WHEN CAST(p.budget_hours AS numeric) > 0
          THEN ROUND(CAST(p.budget_hours AS numeric) - COALESCE(SUM(CAST(te.hours AS numeric)), 0), 2)
          ELSE 0
        END AS remaining_hours,
        COUNT(DISTINCT te.employee_id) AS team_size,
        COUNT(DISTINCT te.date) AS active_days,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = false THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS non_billable_hours
      FROM projects p
      LEFT JOIN timesheet_entries te ON te.project_id = p.id AND te.org_id = p.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
      WHERE p.org_id = ${orgId}
        AND p.is_active = true
        ${filters.projectId ? sql`AND p.id = ${filters.projectId}` : sql``}
      GROUP BY p.id, p.name, p.code, p.client_name, p.budget_hours
      ORDER BY actual_hours DESC
    `);

    return {
      period: { startDate, endDate },
      data: allocation,
    };
  }

  async getProductivity(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // Team productivity overview
    const teamMetrics = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT te.employee_id) AS active_employees,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = false THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS non_billable_hours,
        CASE WHEN COALESCE(SUM(CAST(te.hours AS numeric)), 0) > 0
          THEN ROUND(
            (COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0)
              / COALESCE(SUM(CAST(te.hours AS numeric)), 0)) * 100,
            2
          )
          ELSE 0
        END AS billable_percentage,
        COUNT(DISTINCT te.date) AS total_days_logged,
        CASE WHEN COUNT(DISTINCT te.employee_id) > 0
          THEN ROUND(
            COALESCE(SUM(CAST(te.hours AS numeric)), 0) / COUNT(DISTINCT te.employee_id),
            2
          )
          ELSE 0
        END AS avg_hours_per_employee,
        COUNT(DISTINCT te.project_id) AS projects_worked_on
      FROM timesheet_entries te
      LEFT JOIN employee_profiles ep ON ep.user_id = te.employee_id AND ep.org_id = te.org_id
      WHERE te.org_id = ${orgId}
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
    `);

    // Hours by task category
    const byTaskCategory = await this.db.execute(sql`
      SELECT
        tc.id AS category_id,
        tc.name AS category_name,
        tc.type,
        tc.is_billable,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COUNT(DISTINCT te.employee_id) AS employees,
        COUNT(*) AS entry_count
      FROM task_categories tc
      LEFT JOIN timesheet_entries te ON te.task_category_id = tc.id AND te.org_id = tc.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
      WHERE tc.org_id = ${orgId}
        AND tc.is_active = true
      GROUP BY tc.id, tc.name, tc.type, tc.is_billable
      ORDER BY total_hours DESC
    `);

    return {
      period: { startDate, endDate },
      teamMetrics: teamMetrics[0] ?? {},
      byTaskCategory,
    };
  }

  async getCompliance(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // Total active employees
    const [totalEmployees] = await this.db
      .select({ total: count() })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)));

    // Submission compliance by employee
    const submissionCompliance = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        u.email,
        d.name AS department_name,
        COUNT(ts.id) AS total_submissions,
        COUNT(ts.id) FILTER (WHERE ts.status = 'approved') AS approved_count,
        COUNT(ts.id) FILTER (WHERE ts.status = 'submitted') AS pending_count,
        COUNT(ts.id) FILTER (WHERE ts.status = 'rejected') AS rejected_count,
        COUNT(ts.id) FILTER (WHERE ts.status = 'draft') AS draft_count,
        CASE WHEN ts.submitted_at IS NOT NULL
          THEN true
          ELSE false
        END AS has_submitted
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
      LEFT JOIN timesheet_submissions ts ON ts.employee_id = u.id AND ts.org_id = u.org_id
        AND ts.period_start >= ${startDate}
        AND ts.period_end <= ${endDate}
      WHERE u.org_id = ${orgId}
        AND u.is_active = true
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, u.email, d.name, ts.submitted_at
      ORDER BY total_submissions ASC
    `);

    // Late submissions
    const lateSubmissions = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        ts.period_start,
        ts.period_end,
        ts.submitted_at,
        ts.status
      FROM timesheet_submissions ts
      JOIN users u ON u.id = ts.employee_id AND u.org_id = ts.org_id
      LEFT JOIN employee_profiles ep ON ep.user_id = ts.employee_id AND ep.org_id = ts.org_id
      WHERE ts.org_id = ${orgId}
        AND ts.period_start >= ${startDate}
        AND ts.period_end <= ${endDate}
        AND ts.submitted_at IS NOT NULL
        AND ts.submitted_at > (ts.period_end::timestamp + INTERVAL '3 days')
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      ORDER BY ts.submitted_at DESC
    `);

    // Employees who have not submitted any timesheets in the period
    const nonSubmitters = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        u.email,
        d.name AS department_name
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
      WHERE u.org_id = ${orgId}
        AND u.is_active = true
        AND u.role IN ('employee', 'manager')
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
        AND u.id NOT IN (
          SELECT DISTINCT ts.employee_id
          FROM timesheet_submissions ts
          WHERE ts.org_id = ${orgId}
            AND ts.period_start >= ${startDate}
            AND ts.period_end <= ${endDate}
        )
      ORDER BY u.last_name, u.first_name
    `);

    return {
      period: { startDate, endDate },
      totalEmployees: totalEmployees?.total ?? 0,
      submissionCompliance,
      lateSubmissions,
      nonSubmitters,
    };
  }

  async getTrends(
    orgId: string,
    filters: { startDate?: string; endDate?: string; groupBy?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];
    const groupBy = filters.groupBy ?? 'weekly';

    let dateGroupExpr: ReturnType<typeof sql>;
    if (groupBy === 'monthly') {
      dateGroupExpr = sql`TO_CHAR(te.date::date, 'YYYY-MM')`;
    } else {
      // weekly — group by ISO week start (Monday)
      dateGroupExpr = sql`TO_CHAR(DATE_TRUNC('week', te.date::date), 'YYYY-MM-DD')`;
    }

    // Hours trend
    const hoursTrend = await this.db.execute(sql`
      SELECT
        ${dateGroupExpr} AS period,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = false THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS non_billable_hours,
        COUNT(DISTINCT te.employee_id) AS active_employees,
        COUNT(DISTINCT te.project_id) AS active_projects,
        COUNT(*) AS total_entries
      FROM timesheet_entries te
      LEFT JOIN employee_profiles ep ON ep.user_id = te.employee_id AND ep.org_id = te.org_id
      WHERE te.org_id = ${orgId}
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY ${dateGroupExpr}
      ORDER BY period ASC
    `);

    // Submission trend
    const submissionTrend = await this.db.execute(sql`
      SELECT
        ${groupBy === 'monthly'
          ? sql`TO_CHAR(ts.period_start::date, 'YYYY-MM')`
          : sql`TO_CHAR(DATE_TRUNC('week', ts.period_start::date), 'YYYY-MM-DD')`
        } AS period,
        COUNT(*) AS total_submissions,
        COUNT(*) FILTER (WHERE ts.status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE ts.status = 'rejected') AS rejected,
        COUNT(*) FILTER (WHERE ts.status = 'submitted') AS pending,
        ROUND(AVG(CAST(ts.total_hours AS numeric)), 2) AS avg_hours_per_submission
      FROM timesheet_submissions ts
      LEFT JOIN employee_profiles ep ON ep.user_id = ts.employee_id AND ep.org_id = ts.org_id
      WHERE ts.org_id = ${orgId}
        AND ts.period_start >= ${startDate}
        AND ts.period_end <= ${endDate}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY period
      ORDER BY period ASC
    `);

    return {
      period: { startDate, endDate },
      groupBy,
      hoursTrend,
      submissionTrend,
    };
  }
}
