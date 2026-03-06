import {
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class IntegrationExportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getPayrollExport(
    orgId: string,
    filters: { periodStart?: string; periodEnd?: string; departmentId?: string },
  ) {
    const periodStart =
      filters.periodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const periodEnd = filters.periodEnd ?? new Date().toISOString().split('T')[0];

    // Aggregate approved timesheet data per employee for payroll
    const payrollData = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        u.email,
        ep.employee_id AS employee_code,
        d.name AS department_name,
        des.name AS designation_name,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS billable_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = false THEN CAST(te.hours AS numeric) ELSE 0 END), 0) AS non_billable_hours,
        COUNT(DISTINCT te.date) AS days_worked,
        MIN(te.date) AS first_entry_date,
        MAX(te.date) AS last_entry_date,
        COUNT(DISTINCT te.project_id) AS projects_worked_on
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
      LEFT JOIN designations des ON des.id = ep.designation_id AND des.org_id = u.org_id
      JOIN timesheet_entries te ON te.employee_id = u.id AND te.org_id = u.org_id
        AND te.date >= ${periodStart}
        AND te.date <= ${periodEnd}
        AND te.status = 'approved'
      WHERE u.org_id = ${orgId}
        AND u.is_active = true
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, u.email, ep.employee_id, d.name, des.name
      ORDER BY u.last_name, u.first_name
    `);

    // Summary totals
    const totalHours = payrollData.reduce(
      (sum: number, r: any) => sum + parseFloat(r.total_hours || '0'),
      0,
    );
    const totalBillable = payrollData.reduce(
      (sum: number, r: any) => sum + parseFloat(r.billable_hours || '0'),
      0,
    );

    return {
      exportType: 'payroll',
      period: { periodStart, periodEnd },
      generatedAt: new Date().toISOString(),
      summary: {
        totalEmployees: payrollData.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalBillableHours: Math.round(totalBillable * 100) / 100,
        totalNonBillableHours: Math.round((totalHours - totalBillable) * 100) / 100,
      },
      data: payrollData,
    };
  }

  async getBillingExport(
    orgId: string,
    filters: { periodStart?: string; periodEnd?: string; projectId?: string; clientName?: string },
  ) {
    const periodStart =
      filters.periodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const periodEnd = filters.periodEnd ?? new Date().toISOString().split('T')[0];

    // Billable hours grouped by project and client
    const billingData = await this.db.execute(sql`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.code AS project_code,
        p.client_name,
        p.currency,
        CAST(p.billable_rate AS numeric) AS default_rate,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS billable_hours,
        COUNT(DISTINCT te.employee_id) AS employees,
        COUNT(DISTINCT te.date) AS days,
        CASE WHEN CAST(p.billable_rate AS numeric) > 0
          THEN ROUND(COALESCE(SUM(CAST(te.hours AS numeric)), 0) * CAST(p.billable_rate AS numeric), 2)
          ELSE 0
        END AS estimated_amount,
        MIN(te.date) AS first_entry_date,
        MAX(te.date) AS last_entry_date
      FROM projects p
      JOIN timesheet_entries te ON te.project_id = p.id AND te.org_id = p.org_id
        AND te.date >= ${periodStart}
        AND te.date <= ${periodEnd}
        AND te.is_billable = true
        AND te.status = 'approved'
      WHERE p.org_id = ${orgId}
        AND p.is_active = true
        AND p.is_billable = true
        ${filters.projectId ? sql`AND p.id = ${filters.projectId}` : sql``}
        ${filters.clientName ? sql`AND p.client_name ILIKE ${'%' + filters.clientName + '%'}` : sql``}
      GROUP BY p.id, p.name, p.code, p.client_name, p.currency, p.billable_rate
      ORDER BY estimated_amount DESC
    `);

    // Detail breakdown per project per employee
    const detailBreakdown = await this.db.execute(sql`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        COALESCE(pa.billable_rate, p.billable_rate) AS rate,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS hours,
        CASE WHEN CAST(COALESCE(pa.billable_rate, p.billable_rate) AS numeric) > 0
          THEN ROUND(
            COALESCE(SUM(CAST(te.hours AS numeric)), 0) *
            CAST(COALESCE(pa.billable_rate, p.billable_rate) AS numeric),
            2
          )
          ELSE 0
        END AS amount
      FROM timesheet_entries te
      JOIN projects p ON p.id = te.project_id AND p.org_id = te.org_id
      JOIN users u ON u.id = te.employee_id AND u.org_id = te.org_id
      LEFT JOIN project_assignments pa ON pa.project_id = p.id
        AND pa.employee_id = u.id AND pa.org_id = te.org_id AND pa.is_active = true
      WHERE te.org_id = ${orgId}
        AND te.date >= ${periodStart}
        AND te.date <= ${periodEnd}
        AND te.is_billable = true
        AND te.status = 'approved'
        ${filters.projectId ? sql`AND p.id = ${filters.projectId}` : sql``}
      GROUP BY p.id, p.name, u.id, u.first_name, u.last_name, pa.billable_rate, p.billable_rate
      ORDER BY p.name, u.last_name
    `);

    const totalAmount = billingData.reduce(
      (sum: number, r: any) => sum + parseFloat(r.estimated_amount || '0'),
      0,
    );
    const totalBillableHours = billingData.reduce(
      (sum: number, r: any) => sum + parseFloat(r.billable_hours || '0'),
      0,
    );

    return {
      exportType: 'billing',
      period: { periodStart, periodEnd },
      generatedAt: new Date().toISOString(),
      summary: {
        totalProjects: billingData.length,
        totalBillableHours: Math.round(totalBillableHours * 100) / 100,
        totalEstimatedAmount: Math.round(totalAmount * 100) / 100,
      },
      projectSummary: billingData,
      detailBreakdown,
    };
  }

  async getAttendanceCorrelation(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // Compare timesheet hours with attendance records
    const correlation = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        d.name AS department_name,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) AS timesheet_hours,
        COALESCE(SUM(ar.total_work_minutes), 0) / 60.0 AS attendance_hours,
        COALESCE(SUM(CAST(te.hours AS numeric)), 0)
          - COALESCE(SUM(ar.total_work_minutes), 0) / 60.0 AS variance_hours,
        CASE WHEN COALESCE(SUM(ar.total_work_minutes), 0) > 0
          THEN ROUND(
            ABS(
              COALESCE(SUM(CAST(te.hours AS numeric)), 0) -
              COALESCE(SUM(ar.total_work_minutes), 0) / 60.0
            ) / (COALESCE(SUM(ar.total_work_minutes), 0) / 60.0) * 100,
            2
          )
          ELSE 0
        END AS variance_percentage,
        COUNT(DISTINCT te.date) AS timesheet_days,
        COUNT(DISTINCT ar.date) AS attendance_days
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
      LEFT JOIN timesheet_entries te ON te.employee_id = u.id AND te.org_id = u.org_id
        AND te.date >= ${startDate}
        AND te.date <= ${endDate}
        AND te.status != 'draft'
      LEFT JOIN attendance_records ar ON ar.employee_id = u.id AND ar.org_id = u.org_id
        AND ar.date >= ${startDate}
        AND ar.date <= ${endDate}
        AND ar.status IN ('present', 'late')
      WHERE u.org_id = ${orgId}
        AND u.is_active = true
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, d.name
      HAVING (
        COALESCE(SUM(CAST(te.hours AS numeric)), 0) > 0
        OR COALESCE(SUM(ar.total_work_minutes), 0) > 0
      )
      ORDER BY variance_hours DESC
    `);

    // Flag high-variance employees (variance > 10%)
    const flagged = (correlation as any[]).filter(
      (r: any) => parseFloat(r.variance_percentage || '0') > 10,
    );

    return {
      period: { startDate, endDate },
      totalEmployeesCompared: (correlation as any[]).length,
      flaggedCount: flagged.length,
      data: correlation,
      flaggedEmployees: flagged,
    };
  }

  async customExport(
    orgId: string,
    data: Record<string, any>,
  ) {
    const { startDate, endDate, format, groupBy, includeFields, projectId, departmentId } = data;

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const exportFormat = format ?? 'json'; // json, csv_data
    const grouping = groupBy ?? 'employee'; // employee, project, date, category

    let exportData: any;

    if (grouping === 'employee') {
      exportData = await this.db.execute(sql`
        SELECT
          u.id AS employee_id,
          u.first_name,
          u.last_name,
          u.email,
          ep.employee_id AS employee_code,
          d.name AS department_name,
          te.date,
          p.name AS project_name,
          p.code AS project_code,
          tc.name AS task_category,
          CAST(te.hours AS numeric) AS hours,
          te.description,
          te.is_billable,
          te.status,
          te.start_time,
          te.end_time
        FROM timesheet_entries te
        JOIN users u ON u.id = te.employee_id AND u.org_id = te.org_id
        LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
        LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
        LEFT JOIN projects p ON p.id = te.project_id
        LEFT JOIN task_categories tc ON tc.id = te.task_category_id
        WHERE te.org_id = ${orgId}
          AND te.date >= ${startDate}
          AND te.date <= ${endDate}
          AND te.status != 'draft'
          ${projectId ? sql`AND te.project_id = ${projectId}` : sql``}
          ${departmentId ? sql`AND ep.department_id = ${departmentId}` : sql``}
        ORDER BY u.last_name, u.first_name, te.date ASC
      `);
    } else if (grouping === 'project') {
      exportData = await this.db.execute(sql`
        SELECT
          p.id AS project_id,
          p.name AS project_name,
          p.code AS project_code,
          p.client_name,
          u.first_name,
          u.last_name,
          te.date,
          tc.name AS task_category,
          CAST(te.hours AS numeric) AS hours,
          te.description,
          te.is_billable,
          te.status
        FROM timesheet_entries te
        JOIN projects p ON p.id = te.project_id AND p.org_id = te.org_id
        JOIN users u ON u.id = te.employee_id AND u.org_id = te.org_id
        LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
        LEFT JOIN task_categories tc ON tc.id = te.task_category_id
        WHERE te.org_id = ${orgId}
          AND te.date >= ${startDate}
          AND te.date <= ${endDate}
          AND te.status != 'draft'
          ${projectId ? sql`AND p.id = ${projectId}` : sql``}
          ${departmentId ? sql`AND ep.department_id = ${departmentId}` : sql``}
        ORDER BY p.name, te.date ASC, u.last_name
      `);
    } else if (grouping === 'date') {
      exportData = await this.db.execute(sql`
        SELECT
          te.date,
          u.first_name,
          u.last_name,
          p.name AS project_name,
          p.code AS project_code,
          tc.name AS task_category,
          CAST(te.hours AS numeric) AS hours,
          te.description,
          te.is_billable,
          te.status
        FROM timesheet_entries te
        JOIN users u ON u.id = te.employee_id AND u.org_id = te.org_id
        LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
        LEFT JOIN projects p ON p.id = te.project_id
        LEFT JOIN task_categories tc ON tc.id = te.task_category_id
        WHERE te.org_id = ${orgId}
          AND te.date >= ${startDate}
          AND te.date <= ${endDate}
          AND te.status != 'draft'
          ${projectId ? sql`AND te.project_id = ${projectId}` : sql``}
          ${departmentId ? sql`AND ep.department_id = ${departmentId}` : sql``}
        ORDER BY te.date ASC, u.last_name
      `);
    } else {
      // category
      exportData = await this.db.execute(sql`
        SELECT
          tc.id AS category_id,
          tc.name AS task_category,
          tc.type,
          u.first_name,
          u.last_name,
          p.name AS project_name,
          te.date,
          CAST(te.hours AS numeric) AS hours,
          te.description,
          te.is_billable,
          te.status
        FROM timesheet_entries te
        JOIN users u ON u.id = te.employee_id AND u.org_id = te.org_id
        LEFT JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
        LEFT JOIN projects p ON p.id = te.project_id
        LEFT JOIN task_categories tc ON tc.id = te.task_category_id
        WHERE te.org_id = ${orgId}
          AND te.date >= ${startDate}
          AND te.date <= ${endDate}
          AND te.status != 'draft'
          ${projectId ? sql`AND te.project_id = ${projectId}` : sql``}
          ${departmentId ? sql`AND ep.department_id = ${departmentId}` : sql``}
        ORDER BY tc.name, te.date ASC, u.last_name
      `);
    }

    // If CSV format requested, convert to CSV-ready structure
    if (exportFormat === 'csv_data') {
      const rows = exportData as any[];
      if (rows.length === 0) {
        return {
          exportType: 'custom',
          format: 'csv_data',
          period: { startDate, endDate },
          groupBy: grouping,
          headers: [],
          rows: [],
          totalRows: 0,
        };
      }

      const headers = Object.keys(rows[0]);
      const csvRows = rows.map((row: any) =>
        headers.map((h) => row[h] ?? ''),
      );

      return {
        exportType: 'custom',
        format: 'csv_data',
        period: { startDate, endDate },
        groupBy: grouping,
        generatedAt: new Date().toISOString(),
        headers,
        rows: csvRows,
        totalRows: csvRows.length,
      };
    }

    return {
      exportType: 'custom',
      format: 'json',
      period: { startDate, endDate },
      groupBy: grouping,
      generatedAt: new Date().toISOString(),
      totalRows: (exportData as any[]).length,
      data: exportData,
    };
  }
}
