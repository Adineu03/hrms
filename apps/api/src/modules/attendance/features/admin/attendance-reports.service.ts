import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, sql, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class AttendanceReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getDailySummary(
    orgId: string,
    filters: { date?: string; departmentId?: string; locationId?: string },
  ) {
    const targetDate = filters.date ?? new Date().toISOString().split('T')[0];

    // Total employee count for the org
    const [totalEmployees] = await this.db
      .select({ total: count() })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)));

    // Get attendance records for the date, joined with employee profiles for filtering
    const records = await this.db
      .select({
        record: schema.attendanceRecords,
        departmentId: schema.employeeProfiles.departmentId,
        locationId: schema.employeeProfiles.locationId,
      })
      .from(schema.attendanceRecords)
      .leftJoin(
        schema.employeeProfiles,
        and(
          eq(schema.attendanceRecords.employeeId, schema.employeeProfiles.userId),
          eq(schema.attendanceRecords.orgId, schema.employeeProfiles.orgId),
        ),
      )
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.date, targetDate),
        ),
      );

    // Apply department and location filters
    let filtered = records;
    if (filters.departmentId) {
      filtered = filtered.filter((r) => r.departmentId === filters.departmentId);
    }
    if (filters.locationId) {
      filtered = filtered.filter((r) => r.locationId === filters.locationId);
    }

    const presentCount = filtered.filter(
      (r) => r.record.status === 'present' || r.record.status === 'late',
    ).length;
    const absentCount = filtered.filter((r) => r.record.status === 'absent').length;
    const lateCount = filtered.filter((r) => r.record.status === 'late').length;
    const halfDayCount = filtered.filter((r) => r.record.isHalfDay).length;
    const onLeaveCount = filtered.filter((r) => r.record.status === 'on_leave').length;
    const overtimeCount = filtered.filter((r) => r.record.isOvertime).length;

    const totalWorkMinutes = filtered.reduce(
      (sum, r) => sum + (r.record.totalWorkMinutes ?? 0),
      0,
    );
    const totalOvertimeMinutes = filtered.reduce(
      (sum, r) => sum + (r.record.overtimeMinutes ?? 0),
      0,
    );

    return {
      date: targetDate,
      totalEmployees: totalEmployees?.total ?? 0,
      recordsFound: filtered.length,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      halfDay: halfDayCount,
      onLeave: onLeaveCount,
      overtime: overtimeCount,
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
    };
  }

  async getLateComers(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    const rows = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        u.email,
        ep.department_id,
        d.name AS department_name,
        COUNT(*) AS late_count,
        COALESCE(SUM(ar.late_minutes), 0) AS total_late_minutes,
        ROUND(AVG(ar.late_minutes), 1) AS avg_late_minutes
      FROM attendance_records ar
      JOIN users u ON u.id = ar.employee_id AND u.org_id = ar.org_id
      LEFT JOIN employee_profiles ep ON ep.user_id = ar.employee_id AND ep.org_id = ar.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = ar.org_id
      WHERE ar.org_id = ${orgId}
        AND ar.late_minutes > 0
        AND ar.date >= ${startDate}
        AND ar.date <= ${endDate}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, u.email, ep.department_id, d.name
      ORDER BY late_count DESC, total_late_minutes DESC
    `);

    return {
      period: { startDate, endDate },
      data: rows,
    };
  }

  async getAbsenteeismTrends(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // Daily absenteeism counts
    const dailyTrend = await this.db.execute(sql`
      SELECT
        ar.date,
        COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_count,
        COUNT(*) FILTER (WHERE ar.status IN ('present', 'late')) AS present_count,
        COUNT(*) AS total_records,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(
            (COUNT(*) FILTER (WHERE ar.status = 'absent')::numeric / COUNT(*)::numeric) * 100,
            2
          )
          ELSE 0
        END AS absence_rate
      FROM attendance_records ar
      LEFT JOIN employee_profiles ep ON ep.user_id = ar.employee_id AND ep.org_id = ar.org_id
      WHERE ar.org_id = ${orgId}
        AND ar.date >= ${startDate}
        AND ar.date <= ${endDate}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY ar.date
      ORDER BY ar.date ASC
    `);

    // Department-wise absenteeism
    const byDepartment = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_count,
        COUNT(*) AS total_records,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(
            (COUNT(*) FILTER (WHERE ar.status = 'absent')::numeric / COUNT(*)::numeric) * 100,
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

    return {
      period: { startDate, endDate },
      dailyTrend,
      byDepartment,
    };
  }

  async getShiftAdherence(orgId: string) {
    // Shift adherence: compare clock-in/clock-out times against shift schedule
    const adherence = await this.db.execute(sql`
      SELECT
        s.id AS shift_id,
        s.name AS shift_name,
        s.start_time,
        s.end_time,
        COUNT(DISTINCT esa.employee_id) AS assigned_employees,
        COUNT(ar.id) AS total_records,
        COUNT(ar.id) FILTER (WHERE ar.late_minutes = 0 AND ar.early_departure_minutes = 0) AS on_time_count,
        COUNT(ar.id) FILTER (WHERE ar.late_minutes > 0) AS late_count,
        COUNT(ar.id) FILTER (WHERE ar.early_departure_minutes > 0) AS early_departure_count,
        CASE WHEN COUNT(ar.id) > 0
          THEN ROUND(
            (COUNT(ar.id) FILTER (WHERE ar.late_minutes = 0 AND ar.early_departure_minutes = 0)::numeric
              / COUNT(ar.id)::numeric) * 100,
            2
          )
          ELSE 0
        END AS adherence_rate
      FROM shifts s
      LEFT JOIN employee_shift_assignments esa ON esa.shift_id = s.id AND esa.org_id = s.org_id AND esa.is_current = true
      LEFT JOIN attendance_records ar ON ar.shift_id = s.id AND ar.org_id = s.org_id
        AND ar.date >= (CURRENT_DATE - INTERVAL '30 days')::date
      WHERE s.org_id = ${orgId}
        AND s.is_active = true
      GROUP BY s.id, s.name, s.start_time, s.end_time
      ORDER BY adherence_rate ASC
    `);

    return {
      period: 'last_30_days',
      data: adherence,
    };
  }

  async getOvertimeUtilization(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const startDate =
      filters.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate ?? new Date().toISOString().split('T')[0];

    // By department
    const byDepartment = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(DISTINCT ar.employee_id) AS employees_with_ot,
        COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes,
        ROUND(COALESCE(SUM(ar.overtime_minutes), 0) / 60.0, 2) AS total_overtime_hours,
        ROUND(AVG(ar.overtime_minutes) FILTER (WHERE ar.overtime_minutes > 0), 1) AS avg_ot_minutes_per_record
      FROM departments d
      JOIN employee_profiles ep ON ep.department_id = d.id AND ep.org_id = d.org_id
      LEFT JOIN attendance_records ar ON ar.employee_id = ep.user_id AND ar.org_id = d.org_id
        AND ar.is_overtime = true
        AND ar.date >= ${startDate}
        AND ar.date <= ${endDate}
      WHERE d.org_id = ${orgId}
        ${filters.departmentId ? sql`AND d.id = ${filters.departmentId}` : sql``}
      GROUP BY d.id, d.name
      ORDER BY total_overtime_minutes DESC
    `);

    // By employee (top 20)
    const byEmployee = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        d.name AS department_name,
        COUNT(*) FILTER (WHERE ar.is_overtime = true) AS overtime_days,
        COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes,
        ROUND(COALESCE(SUM(ar.overtime_minutes), 0) / 60.0, 2) AS total_overtime_hours
      FROM users u
      JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
      LEFT JOIN attendance_records ar ON ar.employee_id = u.id AND ar.org_id = u.org_id
        AND ar.date >= ${startDate}
        AND ar.date <= ${endDate}
      WHERE u.org_id = ${orgId}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, d.name
      HAVING COALESCE(SUM(ar.overtime_minutes), 0) > 0
      ORDER BY total_overtime_minutes DESC
      LIMIT 20
    `);

    return {
      period: { startDate, endDate },
      byDepartment,
      byEmployee,
    };
  }
}
