import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, gte, lte, desc, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { attendanceRecords } from '../../../../infrastructure/database/schema/attendance-records';
import { shifts } from '../../../../infrastructure/database/schema/shifts';

@Injectable()
export class TeamDashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private toEmployeeAttendanceRow(row: Record<string, any>) {
    return {
      employeeId: row.userId,
      employeeName: `${row.firstName} ${row.lastName ?? ''}`.trim(),
      email: row.email,
      departmentName: row.departmentName ?? 'Unassigned',
      attendanceId: row.attendanceId,
      date: row.date,
      status: row.status ?? 'absent',
      clockIn: row.clockIn,
      clockOut: row.clockOut,
      lateMinutes: row.lateMinutes ?? 0,
      totalWorkMinutes: row.totalWorkMinutes ?? 0,
      overtimeMinutes: row.overtimeMinutes ?? 0,
      isHalfDay: row.isHalfDay ?? false,
      shiftName: row.shiftName,
    };
  }

  async getTodayAttendance(orgId: string, managerId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Get all team members
    const teamMembers = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        departmentName: departments.name,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(departments, eq(employeeProfiles.departmentId, departments.id))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
          eq(users.isActive, true),
        ),
      );

    // Get today's attendance records for team members
    const teamUserIds = teamMembers.map((m) => m.userId);
    if (teamUserIds.length === 0) {
      return {
        date: today,
        summary: { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, wfh: 0, onLeave: 0 },
        employees: [],
      };
    }

    const todayRecords = await this.db
      .select({
        attendanceId: attendanceRecords.id,
        employeeId: attendanceRecords.employeeId,
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        lateMinutes: attendanceRecords.lateMinutes,
        totalWorkMinutes: attendanceRecords.totalWorkMinutes,
        overtimeMinutes: attendanceRecords.overtimeMinutes,
        isHalfDay: attendanceRecords.isHalfDay,
        shiftName: shifts.name,
      })
      .from(attendanceRecords)
      .leftJoin(shifts, eq(attendanceRecords.shiftId, shifts.id))
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          eq(attendanceRecords.date, today),
        ),
      );

    // Build a map of attendance records by employeeId
    const attendanceMap = new Map<string, typeof todayRecords[0]>();
    for (const rec of todayRecords) {
      if (teamUserIds.includes(rec.employeeId)) {
        attendanceMap.set(rec.employeeId, rec);
      }
    }

    // Build employee attendance rows
    const employees = teamMembers.map((member) => {
      const rec = attendanceMap.get(member.userId);
      return this.toEmployeeAttendanceRow({
        ...member,
        attendanceId: rec?.attendanceId ?? null,
        date: today,
        status: rec?.status ?? 'absent',
        clockIn: rec?.clockIn ?? null,
        clockOut: rec?.clockOut ?? null,
        lateMinutes: rec?.lateMinutes ?? 0,
        totalWorkMinutes: rec?.totalWorkMinutes ?? 0,
        overtimeMinutes: rec?.overtimeMinutes ?? 0,
        isHalfDay: rec?.isHalfDay ?? false,
        shiftName: rec?.shiftName ?? null,
      });
    });

    // Compute summary
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let wfh = 0;
    let onLeave = 0;

    for (const emp of employees) {
      switch (emp.status) {
        case 'present':
          present++;
          if (emp.lateMinutes > 0) late++;
          if (emp.isHalfDay) halfDay++;
          break;
        case 'wfh':
        case 'work_from_home':
          wfh++;
          present++;
          break;
        case 'on_leave':
        case 'leave':
          onLeave++;
          break;
        case 'half_day':
          halfDay++;
          present++;
          break;
        default:
          absent++;
          break;
      }
    }

    return {
      date: today,
      summary: {
        total: teamMembers.length,
        present,
        absent,
        late,
        halfDay,
        wfh,
        onLeave,
      },
      employees,
    };
  }

  async getAttendanceSummary(
    orgId: string,
    managerId: string,
    period: string,
    date: string,
  ) {
    // Determine date range based on period
    const refDate = new Date(date || new Date().toISOString().split('T')[0]);
    let startDate: string;
    let endDate: string;

    if (period === 'weekly') {
      const dayOfWeek = refDate.getDay();
      const start = new Date(refDate);
      start.setDate(refDate.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    } else {
      // monthly
      startDate = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
      endDate = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Get team members
    const teamMembers = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
          eq(users.isActive, true),
        ),
      );

    const teamUserIds = teamMembers.map((m) => m.userId);
    if (teamUserIds.length === 0) {
      return { period, startDate, endDate, data: [] };
    }

    // Get attendance records for date range
    const records = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        status: attendanceRecords.status,
        totalWorkMinutes: attendanceRecords.totalWorkMinutes,
        overtimeMinutes: attendanceRecords.overtimeMinutes,
        lateMinutes: attendanceRecords.lateMinutes,
        isHalfDay: attendanceRecords.isHalfDay,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
        ),
      );

    // Filter to team members only
    const teamRecords = records.filter((r) => teamUserIds.includes(r.employeeId));

    // Aggregate per employee
    const summaryMap = new Map<
      string,
      {
        presentDays: number;
        absentDays: number;
        lateDays: number;
        halfDays: number;
        wfhDays: number;
        totalWorkHours: number;
        overtimeHours: number;
      }
    >();

    for (const rec of teamRecords) {
      if (!summaryMap.has(rec.employeeId)) {
        summaryMap.set(rec.employeeId, {
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          halfDays: 0,
          wfhDays: 0,
          totalWorkHours: 0,
          overtimeHours: 0,
        });
      }
      const s = summaryMap.get(rec.employeeId)!;
      const status = rec.status ?? 'absent';

      if (status === 'present' || status === 'wfh' || status === 'work_from_home' || status === 'half_day') {
        s.presentDays++;
      } else if (status === 'absent') {
        s.absentDays++;
      }
      if ((rec.lateMinutes ?? 0) > 0) s.lateDays++;
      if (rec.isHalfDay) s.halfDays++;
      if (status === 'wfh' || status === 'work_from_home') s.wfhDays++;
      s.totalWorkHours += Math.round((rec.totalWorkMinutes ?? 0) / 60 * 100) / 100;
      s.overtimeHours += Math.round((rec.overtimeMinutes ?? 0) / 60 * 100) / 100;
    }

    const data = teamMembers.map((member) => {
      const s = summaryMap.get(member.userId) ?? {
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        wfhDays: 0,
        totalWorkHours: 0,
        overtimeHours: 0,
      };
      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        ...s,
      };
    });

    return { period, startDate, endDate, data };
  }

  async getHeatmap(
    orgId: string,
    managerId: string,
    startDate: string,
    endDate: string,
  ) {
    // Get team members
    const teamMembers = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
          eq(users.isActive, true),
        ),
      );

    const teamUserIds = teamMembers.map((m) => m.userId);
    if (teamUserIds.length === 0) {
      return { startDate, endDate, data: [] };
    }

    // Get attendance records for date range
    const records = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
        ),
      )
      .orderBy(asc(attendanceRecords.date));

    // Filter to team members
    const teamRecords = records.filter((r) => teamUserIds.includes(r.employeeId));

    // Group by employee
    const employeeRecordMap = new Map<string, Array<{ date: string; status: string; clockIn: any; clockOut: any }>>();
    for (const rec of teamRecords) {
      if (!employeeRecordMap.has(rec.employeeId)) {
        employeeRecordMap.set(rec.employeeId, []);
      }
      employeeRecordMap.get(rec.employeeId)!.push({
        date: rec.date,
        status: rec.status,
        clockIn: rec.clockIn,
        clockOut: rec.clockOut,
      });
    }

    const data = teamMembers.map((member) => ({
      employeeId: member.userId,
      employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
      days: employeeRecordMap.get(member.userId) ?? [],
    }));

    return { startDate, endDate, data };
  }
}
