import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getUtilization(
    orgId: string,
    filters: {
      year?: string;
      departmentId?: string;
      locationId?: string;
      gradeId?: string;
      leaveTypeId?: string;
    },
  ) {
    const currentYear = filters.year ?? new Date().getFullYear().toString();

    // By leave type
    const byLeaveType = await this.db.execute(sql`
      SELECT
        lt.id AS leave_type_id,
        lt.name AS leave_type_name,
        lt.code AS leave_type_code,
        COUNT(DISTINCT lb.employee_id) AS employee_count,
        COALESCE(SUM(lb.entitled::numeric), 0) AS total_entitled,
        COALESCE(SUM(lb.used::numeric), 0) AS total_used,
        COALESCE(SUM(lb.available::numeric), 0) AS total_available,
        CASE WHEN SUM(lb.entitled::numeric) > 0
          THEN ROUND(
            (SUM(lb.used::numeric) / SUM(lb.entitled::numeric)) * 100,
            2
          )
          ELSE 0
        END AS utilization_rate
      FROM leave_types lt
      LEFT JOIN leave_balances lb ON lb.leave_type_id = lt.id AND lb.org_id = lt.org_id
        AND lb.year = ${currentYear}
      LEFT JOIN employee_profiles ep ON ep.user_id = lb.employee_id AND ep.org_id = lb.org_id
      WHERE lt.org_id = ${orgId}
        AND lt.is_active = true
        ${filters.leaveTypeId ? sql`AND lt.id = ${filters.leaveTypeId}` : sql``}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
        ${filters.locationId ? sql`AND ep.location_id = ${filters.locationId}` : sql``}
        ${filters.gradeId ? sql`AND ep.grade_id = ${filters.gradeId}` : sql``}
      GROUP BY lt.id, lt.name, lt.code
      ORDER BY utilization_rate DESC
    `);

    // By department
    const byDepartment = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(DISTINCT lb.employee_id) AS employee_count,
        COALESCE(SUM(lb.entitled::numeric), 0) AS total_entitled,
        COALESCE(SUM(lb.used::numeric), 0) AS total_used,
        COALESCE(SUM(lb.available::numeric), 0) AS total_available,
        CASE WHEN SUM(lb.entitled::numeric) > 0
          THEN ROUND(
            (SUM(lb.used::numeric) / SUM(lb.entitled::numeric)) * 100,
            2
          )
          ELSE 0
        END AS utilization_rate
      FROM departments d
      JOIN employee_profiles ep ON ep.department_id = d.id AND ep.org_id = d.org_id
      JOIN leave_balances lb ON lb.employee_id = ep.user_id AND lb.org_id = d.org_id
        AND lb.year = ${currentYear}
      WHERE d.org_id = ${orgId}
        ${filters.departmentId ? sql`AND d.id = ${filters.departmentId}` : sql``}
        ${filters.locationId ? sql`AND ep.location_id = ${filters.locationId}` : sql``}
        ${filters.gradeId ? sql`AND ep.grade_id = ${filters.gradeId}` : sql``}
      GROUP BY d.id, d.name
      ORDER BY utilization_rate DESC
    `);

    return {
      year: currentYear,
      byLeaveType,
      byDepartment,
    };
  }

  async getTrends(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ??
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // Monthly leave patterns
    const monthlyTrend = await this.db.execute(sql`
      SELECT
        TO_CHAR(lr.from_date::date, 'YYYY-MM') AS month,
        COUNT(*) AS total_requests,
        COALESCE(SUM(lr.total_days::numeric), 0) AS total_days,
        COUNT(*) FILTER (WHERE lr.status = 'approved') AS approved_count,
        COUNT(*) FILTER (WHERE lr.status = 'rejected') AS rejected_count,
        COUNT(*) FILTER (WHERE lr.status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE lr.status = 'cancelled') AS cancelled_count
      FROM leave_requests lr
      LEFT JOIN employee_profiles ep ON ep.user_id = lr.employee_id AND ep.org_id = lr.org_id
      WHERE lr.org_id = ${orgId}
        AND lr.from_date >= ${startDate}
        AND lr.from_date <= ${endDate}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY TO_CHAR(lr.from_date::date, 'YYYY-MM')
      ORDER BY month ASC
    `);

    // By leave type
    const byLeaveType = await this.db.execute(sql`
      SELECT
        lt.id AS leave_type_id,
        lt.name AS leave_type_name,
        lt.code AS leave_type_code,
        COUNT(*) AS total_requests,
        COALESCE(SUM(lr.total_days::numeric), 0) AS total_days
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.org_id = lr.org_id
      LEFT JOIN employee_profiles ep ON ep.user_id = lr.employee_id AND ep.org_id = lr.org_id
      WHERE lr.org_id = ${orgId}
        AND lr.from_date >= ${startDate}
        AND lr.from_date <= ${endDate}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY lt.id, lt.name, lt.code
      ORDER BY total_days DESC
    `);

    // Day-of-week distribution
    const dayOfWeekDistribution = await this.db.execute(sql`
      SELECT
        EXTRACT(DOW FROM lr.from_date::date) AS day_of_week,
        TO_CHAR(lr.from_date::date, 'Day') AS day_name,
        COUNT(*) AS request_count
      FROM leave_requests lr
      LEFT JOIN employee_profiles ep ON ep.user_id = lr.employee_id AND ep.org_id = lr.org_id
      WHERE lr.org_id = ${orgId}
        AND lr.from_date >= ${startDate}
        AND lr.from_date <= ${endDate}
        AND lr.status IN ('approved', 'pending')
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY EXTRACT(DOW FROM lr.from_date::date), TO_CHAR(lr.from_date::date, 'Day')
      ORDER BY day_of_week ASC
    `);

    return {
      period: { startDate, endDate },
      monthlyTrend,
      byLeaveType,
      dayOfWeekDistribution,
    };
  }

  async getPendingApproval(
    orgId: string,
    filters: { departmentId?: string },
  ) {
    // Pending requests with employee details
    const pendingRequests = await this.db.execute(sql`
      SELECT
        lr.id,
        lr.employee_id,
        u.first_name,
        u.last_name,
        u.email,
        lt.name AS leave_type_name,
        lr.from_date,
        lr.to_date,
        lr.total_days,
        lr.reason,
        lr.current_approver_level,
        lr.created_at,
        EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 3600 AS hours_pending,
        d.name AS department_name
      FROM leave_requests lr
      JOIN users u ON u.id = lr.employee_id AND u.org_id = lr.org_id
      JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.org_id = lr.org_id
      LEFT JOIN employee_profiles ep ON ep.user_id = lr.employee_id AND ep.org_id = lr.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = lr.org_id
      WHERE lr.org_id = ${orgId}
        AND lr.status = 'pending'
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      ORDER BY lr.created_at ASC
    `);

    // Approval metrics
    const approvalMetrics = await this.db.execute(sql`
      SELECT
        COUNT(*) AS total_pending,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 3600), 1) AS avg_hours_pending,
        MAX(EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 3600) AS max_hours_pending,
        COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 3600 > 48) AS overdue_count
      FROM leave_requests lr
      WHERE lr.org_id = ${orgId}
        AND lr.status = 'pending'
    `);

    // Bottlenecks by approver level
    const bottlenecks = await this.db.execute(sql`
      SELECT
        lr.current_approver_level,
        COUNT(*) AS pending_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 3600), 1) AS avg_hours_pending
      FROM leave_requests lr
      WHERE lr.org_id = ${orgId}
        AND lr.status = 'pending'
      GROUP BY lr.current_approver_level
      ORDER BY pending_count DESC
    `);

    return {
      metrics: approvalMetrics[0] ?? {
        total_pending: 0,
        avg_hours_pending: 0,
        max_hours_pending: 0,
        overdue_count: 0,
      },
      bottlenecks,
      pendingRequests,
    };
  }

  async getLiability(
    orgId: string,
    filters: { year?: string; departmentId?: string },
  ) {
    const currentYear = filters.year ?? new Date().getFullYear().toString();

    // Leave liability: unused balances that could potentially be encashed
    const liability = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        lt.id AS leave_type_id,
        lt.name AS leave_type_name,
        lt.code AS leave_type_code,
        lt.is_paid,
        lt.encashment_enabled,
        COUNT(DISTINCT lb.employee_id) AS employee_count,
        COALESCE(SUM(lb.available::numeric), 0) AS total_unused_days,
        ROUND(AVG(lb.available::numeric), 1) AS avg_unused_per_employee
      FROM departments d
      JOIN employee_profiles ep ON ep.department_id = d.id AND ep.org_id = d.org_id
      JOIN leave_balances lb ON lb.employee_id = ep.user_id AND lb.org_id = d.org_id
        AND lb.year = ${currentYear}
      JOIN leave_types lt ON lt.id = lb.leave_type_id AND lt.org_id = d.org_id
        AND lt.is_active = true
      WHERE d.org_id = ${orgId}
        AND lb.available::numeric > 0
        ${filters.departmentId ? sql`AND d.id = ${filters.departmentId}` : sql``}
      GROUP BY d.id, d.name, lt.id, lt.name, lt.code, lt.is_paid, lt.encashment_enabled
      ORDER BY total_unused_days DESC
    `);

    // Organization-wide summary
    const summary = await this.db.execute(sql`
      SELECT
        COALESCE(SUM(lb.available::numeric), 0) AS total_unused_days,
        COUNT(DISTINCT lb.employee_id) AS total_employees,
        ROUND(AVG(lb.available::numeric), 1) AS avg_unused_per_employee,
        COALESCE(SUM(lb.available::numeric) FILTER (
          WHERE lt.encashment_enabled = true
        ), 0) AS encashable_days
      FROM leave_balances lb
      JOIN leave_types lt ON lt.id = lb.leave_type_id AND lt.org_id = lb.org_id
      LEFT JOIN employee_profiles ep ON ep.user_id = lb.employee_id AND ep.org_id = lb.org_id
      WHERE lb.org_id = ${orgId}
        AND lb.year = ${currentYear}
        AND lb.available::numeric > 0
        AND lt.is_active = true
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
    `);

    return {
      year: currentYear,
      summary: summary[0] ?? {
        total_unused_days: 0,
        total_employees: 0,
        avg_unused_per_employee: 0,
        encashable_days: 0,
      },
      byDepartmentAndType: liability,
    };
  }

  async getAbsenteeism(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ??
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // Leave-based absenteeism
    const leaveAbsenteeism = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(DISTINCT lr.employee_id) AS employees_on_leave,
        COALESCE(SUM(lr.total_days::numeric), 0) AS total_leave_days,
        COUNT(*) AS total_leave_requests
      FROM leave_requests lr
      JOIN employee_profiles ep ON ep.user_id = lr.employee_id AND ep.org_id = lr.org_id
      JOIN departments d ON d.id = ep.department_id AND d.org_id = lr.org_id
      WHERE lr.org_id = ${orgId}
        AND lr.status = 'approved'
        AND lr.from_date >= ${startDate}
        AND lr.to_date <= ${endDate}
        ${filters.departmentId ? sql`AND d.id = ${filters.departmentId}` : sql``}
      GROUP BY d.id, d.name
      ORDER BY total_leave_days DESC
    `);

    // Attendance-based absenteeism (cross-reference with attendance records)
    const attendanceAbsenteeism = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
        COUNT(*) FILTER (WHERE ar.status = 'on_leave') AS on_leave_days,
        COUNT(*) AS total_records,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(
            (COUNT(*) FILTER (WHERE ar.status IN ('absent', 'on_leave'))::numeric / COUNT(*)::numeric) * 100,
            2
          )
          ELSE 0
        END AS absence_rate
      FROM attendance_records ar
      JOIN employee_profiles ep ON ep.user_id = ar.employee_id AND ep.org_id = ar.org_id
      JOIN departments d ON d.id = ep.department_id AND d.org_id = ar.org_id
      WHERE ar.org_id = ${orgId}
        AND ar.date >= ${startDate}
        AND ar.date <= ${endDate}
        ${filters.departmentId ? sql`AND d.id = ${filters.departmentId}` : sql``}
      GROUP BY d.id, d.name
      ORDER BY absence_rate DESC
    `);

    // Top absentees (employees with most leave days)
    const topAbsentees = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        d.name AS department_name,
        COALESCE(SUM(lr.total_days::numeric), 0) AS total_leave_days,
        COUNT(*) AS total_requests
      FROM leave_requests lr
      JOIN users u ON u.id = lr.employee_id AND u.org_id = lr.org_id
      LEFT JOIN employee_profiles ep ON ep.user_id = lr.employee_id AND ep.org_id = lr.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = lr.org_id
      WHERE lr.org_id = ${orgId}
        AND lr.status = 'approved'
        AND lr.from_date >= ${startDate}
        AND lr.to_date <= ${endDate}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, d.name
      ORDER BY total_leave_days DESC
      LIMIT 20
    `);

    return {
      period: { startDate, endDate },
      leaveAbsenteeism,
      attendanceAbsenteeism,
      topAbsentees,
    };
  }
}
