import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, gte, lte, asc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { attendanceRecords } from '../../../../infrastructure/database/schema/attendance-records';
import { shifts } from '../../../../infrastructure/database/schema/shifts';
import { employeeShiftAssignments } from '../../../../infrastructure/database/schema/employee-shift-assignments';
import { holidayCalendars } from '../../../../infrastructure/database/schema/holiday-calendars';

@Injectable()
export class TeamReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMembers(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
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
  }

  async getAttendanceReport(
    orgId: string,
    managerId: string,
    startDate: string,
    endDate: string,
  ) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    if (teamMembers.length === 0) {
      return { startDate, endDate, data: [] };
    }

    const teamUserIds = teamMembers.map((m) => m.userId);

    // Get attendance records for the period
    const records = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        totalWorkMinutes: attendanceRecords.totalWorkMinutes,
        overtimeMinutes: attendanceRecords.overtimeMinutes,
        lateMinutes: attendanceRecords.lateMinutes,
        earlyDepartureMinutes: attendanceRecords.earlyDepartureMinutes,
        isHalfDay: attendanceRecords.isHalfDay,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          inArray(attendanceRecords.employeeId, teamUserIds),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
        ),
      );

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
        avgWorkHoursPerDay: number;
        totalLateMinutes: number;
        totalEarlyDepartureMinutes: number;
      }
    >();

    for (const rec of records) {
      if (!summaryMap.has(rec.employeeId)) {
        summaryMap.set(rec.employeeId, {
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          halfDays: 0,
          wfhDays: 0,
          totalWorkHours: 0,
          overtimeHours: 0,
          avgWorkHoursPerDay: 0,
          totalLateMinutes: 0,
          totalEarlyDepartureMinutes: 0,
        });
      }
      const s = summaryMap.get(rec.employeeId)!;
      const status = rec.status ?? 'absent';

      if (['present', 'wfh', 'work_from_home', 'half_day'].includes(status)) {
        s.presentDays++;
      } else if (status === 'absent') {
        s.absentDays++;
      }
      if ((rec.lateMinutes ?? 0) > 0) {
        s.lateDays++;
        s.totalLateMinutes += rec.lateMinutes ?? 0;
      }
      if (rec.isHalfDay) s.halfDays++;
      if (status === 'wfh' || status === 'work_from_home') s.wfhDays++;
      s.totalWorkHours += Math.round(((rec.totalWorkMinutes ?? 0) / 60) * 100) / 100;
      s.overtimeHours += Math.round(((rec.overtimeMinutes ?? 0) / 60) * 100) / 100;
      s.totalEarlyDepartureMinutes += rec.earlyDepartureMinutes ?? 0;
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
        avgWorkHoursPerDay: 0,
        totalLateMinutes: 0,
        totalEarlyDepartureMinutes: 0,
      };
      s.avgWorkHoursPerDay =
        s.presentDays > 0
          ? Math.round((s.totalWorkHours / s.presentDays) * 100) / 100
          : 0;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        departmentName: member.departmentName ?? 'Unassigned',
        ...s,
      };
    });

    return { startDate, endDate, data };
  }

  async getAbsenteeismReport(
    orgId: string,
    managerId: string,
    startDate: string,
    endDate: string,
    employeeId?: string,
  ) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    if (teamMembers.length === 0) {
      return { startDate, endDate, data: [] };
    }

    let targetMembers = teamMembers;
    if (employeeId) {
      targetMembers = teamMembers.filter((m) => m.userId === employeeId);
      if (targetMembers.length === 0) {
        return { startDate, endDate, data: [] };
      }
    }

    const targetIds = targetMembers.map((m) => m.userId);

    // Get attendance records for absence analysis
    const records = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        date: attendanceRecords.date,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          inArray(attendanceRecords.employeeId, targetIds),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
        ),
      )
      .orderBy(asc(attendanceRecords.date));

    // Get holidays for the period to detect post-holiday absences
    const holidays = await this.db
      .select({ date: holidayCalendars.date })
      .from(holidayCalendars)
      .where(
        and(
          eq(holidayCalendars.orgId, orgId),
          gte(holidayCalendars.date, startDate),
          lte(holidayCalendars.date, endDate),
        ),
      );

    const holidayDates = new Set(holidays.map((h) => h.date));

    // Analyze patterns per employee
    const data = targetMembers.map((member) => {
      const empRecords = records.filter(
        (r) => r.employeeId === member.userId && r.status === 'absent',
      );

      const absentDates = empRecords.map((r) => new Date(r.date));
      let mondays = 0;
      let fridays = 0;
      let postHoliday = 0;

      for (const d of absentDates) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 1) mondays++;
        if (dayOfWeek === 5) fridays++;

        // Check if previous day was a holiday
        const prevDay = new Date(d);
        prevDay.setDate(d.getDate() - 1);
        const prevDayStr = prevDay.toISOString().split('T')[0];
        if (holidayDates.has(prevDayStr)) {
          postHoliday++;
        }
      }

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        departmentName: member.departmentName ?? 'Unassigned',
        absentDays: absentDates.length,
        patterns: {
          mondays,
          fridays,
          postHoliday,
        },
        absentDates: absentDates.map((d) => d.toISOString().split('T')[0]),
      };
    });

    return { startDate, endDate, data };
  }

  async getPunctualityReport(
    orgId: string,
    managerId: string,
    month: string,
    year: string,
  ) {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const teamMembers = await this.getTeamMembers(orgId, managerId);
    if (teamMembers.length === 0) {
      return { month: monthNum, year: yearNum, data: [] };
    }

    const teamUserIds = teamMembers.map((m) => m.userId);

    // Get attendance records for the month
    const records = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        lateMinutes: attendanceRecords.lateMinutes,
        earlyDepartureMinutes: attendanceRecords.earlyDepartureMinutes,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          inArray(attendanceRecords.employeeId, teamUserIds),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
        ),
      );

    // Calculate punctuality score per employee
    const scoreMap = new Map<
      string,
      {
        totalDays: number;
        onTimeDays: number;
        lateDays: number;
        totalLateMinutes: number;
        earlyDepartureDays: number;
        totalEarlyMinutes: number;
      }
    >();

    for (const rec of records) {
      const status = rec.status ?? 'absent';
      if (!['present', 'wfh', 'work_from_home', 'half_day'].includes(status)) continue;

      if (!scoreMap.has(rec.employeeId)) {
        scoreMap.set(rec.employeeId, {
          totalDays: 0,
          onTimeDays: 0,
          lateDays: 0,
          totalLateMinutes: 0,
          earlyDepartureDays: 0,
          totalEarlyMinutes: 0,
        });
      }
      const s = scoreMap.get(rec.employeeId)!;
      s.totalDays++;

      const late = rec.lateMinutes ?? 0;
      const early = rec.earlyDepartureMinutes ?? 0;

      if (late === 0) {
        s.onTimeDays++;
      } else {
        s.lateDays++;
        s.totalLateMinutes += late;
      }

      if (early > 0) {
        s.earlyDepartureDays++;
        s.totalEarlyMinutes += early;
      }
    }

    const data = teamMembers.map((member) => {
      const s = scoreMap.get(member.userId) ?? {
        totalDays: 0,
        onTimeDays: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        earlyDepartureDays: 0,
        totalEarlyMinutes: 0,
      };

      // Punctuality score: (onTimeDays / totalDays) * 100
      const punctualityScore =
        s.totalDays > 0
          ? Math.round((s.onTimeDays / s.totalDays) * 10000) / 100
          : 100;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        departmentName: member.departmentName ?? 'Unassigned',
        punctualityScore,
        totalDays: s.totalDays,
        onTimeDays: s.onTimeDays,
        lateDays: s.lateDays,
        avgLateMinutes:
          s.lateDays > 0
            ? Math.round((s.totalLateMinutes / s.lateDays) * 100) / 100
            : 0,
        earlyDepartureDays: s.earlyDepartureDays,
        avgEarlyMinutes:
          s.earlyDepartureDays > 0
            ? Math.round((s.totalEarlyMinutes / s.earlyDepartureDays) * 100) / 100
            : 0,
      };
    });

    // Sort by punctuality score ascending (worst first)
    data.sort((a, b) => a.punctualityScore - b.punctualityScore);

    return { month: monthNum, year: yearNum, data };
  }

  async getShiftComplianceReport(
    orgId: string,
    managerId: string,
    startDate: string,
    endDate: string,
  ) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    if (teamMembers.length === 0) {
      return { startDate, endDate, data: [] };
    }

    const teamUserIds = teamMembers.map((m) => m.userId);

    // Get shift assignments for each team member
    const assignments = await this.db
      .select({
        employeeId: employeeShiftAssignments.employeeId,
        shiftId: employeeShiftAssignments.shiftId,
        effectiveFrom: employeeShiftAssignments.effectiveFrom,
        effectiveTo: employeeShiftAssignments.effectiveTo,
        shiftName: shifts.name,
        shiftStartTime: shifts.startTime,
        shiftEndTime: shifts.endTime,
      })
      .from(employeeShiftAssignments)
      .innerJoin(shifts, eq(employeeShiftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(employeeShiftAssignments.orgId, orgId),
          inArray(employeeShiftAssignments.employeeId, teamUserIds),
          lte(employeeShiftAssignments.effectiveFrom, endDate),
        ),
      );

    // Get attendance records for the period
    const records = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        date: attendanceRecords.date,
        shiftId: attendanceRecords.shiftId,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        lateMinutes: attendanceRecords.lateMinutes,
        earlyDepartureMinutes: attendanceRecords.earlyDepartureMinutes,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          inArray(attendanceRecords.employeeId, teamUserIds),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
        ),
      );

    // Calculate compliance per employee
    const complianceMap = new Map<
      string,
      { assignedShifts: number; adherent: number; violations: number }
    >();

    for (const rec of records) {
      const status = rec.status ?? 'absent';
      if (!['present', 'wfh', 'work_from_home', 'half_day'].includes(status)) continue;

      if (!complianceMap.has(rec.employeeId)) {
        complianceMap.set(rec.employeeId, { assignedShifts: 0, adherent: 0, violations: 0 });
      }
      const c = complianceMap.get(rec.employeeId)!;
      c.assignedShifts++;

      // A violation is counted if late > 0 or early departure > 0
      const late = rec.lateMinutes ?? 0;
      const early = rec.earlyDepartureMinutes ?? 0;

      if (late === 0 && early === 0) {
        c.adherent++;
      } else {
        c.violations++;
      }
    }

    const data = teamMembers.map((member) => {
      const c = complianceMap.get(member.userId) ?? {
        assignedShifts: 0,
        adherent: 0,
        violations: 0,
      };
      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        departmentName: member.departmentName ?? 'Unassigned',
        assignedShifts: c.assignedShifts,
        adherent: c.adherent,
        violations: c.violations,
        complianceRate:
          c.assignedShifts > 0
            ? Math.round((c.adherent / c.assignedShifts) * 10000) / 100
            : 100,
      };
    });

    return { startDate, endDate, data };
  }
}
