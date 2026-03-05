import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, gte, lte, asc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { attendanceRecords } from '../../../../infrastructure/database/schema/attendance-records';
import { holidayCalendars } from '../../../../infrastructure/database/schema/holiday-calendars';

@Injectable()
export class LeaveCorrelationService {
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

  async getCalendar(
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
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.orgId, orgId),
          inArray(attendanceRecords.employeeId, teamUserIds),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
        ),
      )
      .orderBy(asc(attendanceRecords.date));

    // Get holidays for the month
    const holidays = await this.db
      .select({
        date: holidayCalendars.date,
        name: holidayCalendars.name,
        type: holidayCalendars.type,
      })
      .from(holidayCalendars)
      .where(
        and(
          eq(holidayCalendars.orgId, orgId),
          gte(holidayCalendars.date, startDate),
          lte(holidayCalendars.date, endDate),
        ),
      );

    const holidayMap = new Map<string, { name: string; type: string }>();
    for (const h of holidays) {
      holidayMap.set(h.date, { name: h.name, type: h.type });
    }

    // Build calendar data per employee
    const data = teamMembers.map((member) => {
      const memberRecords = records.filter((r) => r.employeeId === member.userId);
      const recordMap = new Map<string, typeof memberRecords[0]>();
      for (const rec of memberRecords) {
        recordMap.set(rec.date, rec);
      }

      const days: Array<{
        date: string;
        attendanceStatus: string;
        leaveStatus: string | null;
        isHoliday: boolean;
        holidayName?: string;
      }> = [];

      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const rec = recordMap.get(dateStr);
        const holiday = holidayMap.get(dateStr);
        const dayOfWeek = new Date(dateStr).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let attendanceStatus = 'no_data';
        let leaveStatus: string | null = null;

        if (rec) {
          attendanceStatus = rec.status ?? 'absent';
          // Determine leave status from attendance status
          if (rec.status === 'on_leave' || rec.status === 'leave') {
            leaveStatus = 'on_leave';
            attendanceStatus = 'absent';
          }
        } else if (holiday) {
          attendanceStatus = 'holiday';
        } else if (isWeekend) {
          attendanceStatus = 'weekend';
        }

        const dayEntry: {
          date: string;
          attendanceStatus: string;
          leaveStatus: string | null;
          isHoliday: boolean;
          holidayName?: string;
        } = {
          date: dateStr,
          attendanceStatus,
          leaveStatus,
          isHoliday: !!holiday,
        };

        if (holiday) {
          dayEntry.holidayName = holiday.name;
        }

        days.push(dayEntry);
      }

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        departmentName: member.departmentName ?? 'Unassigned',
        days,
      };
    });

    return { month: monthNum, year: yearNum, data };
  }

  async getUnapprovedAbsences(
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

    // Get attendance records that are absent (no leave applied)
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
          inArray(attendanceRecords.employeeId, teamUserIds),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate),
          eq(attendanceRecords.status, 'absent'),
        ),
      )
      .orderBy(asc(attendanceRecords.date));

    // Get holidays for exclusion
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

    // Build name map
    const nameMap = new Map<string, string>();
    for (const m of teamMembers) {
      nameMap.set(m.userId, `${m.firstName} ${m.lastName ?? ''}`.trim());
    }

    // Filter out holidays and weekends — these are genuine unapproved absences
    const unapprovedAbsences: Array<{
      employeeId: string;
      employeeName: string;
      date: string;
      recommendation: string;
    }> = [];

    for (const rec of records) {
      const d = new Date(rec.date);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Skip weekends and holidays
      if (isWeekend || holidayDates.has(rec.date)) continue;

      unapprovedAbsences.push({
        employeeId: rec.employeeId,
        employeeName: nameMap.get(rec.employeeId) ?? 'Unknown',
        date: rec.date,
        recommendation: 'Employee was absent without an approved leave. Consider following up to apply leave or mark as regularized.',
      });
    }

    return { startDate, endDate, data: unapprovedAbsences };
  }

  async getCorrelationSummary(
    orgId: string,
    managerId: string,
  ) {
    const now = new Date();
    const monthNum = now.getMonth() + 1;
    const yearNum = now.getFullYear();
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const teamMembers = await this.getTeamMembers(orgId, managerId);
    if (teamMembers.length === 0) {
      return {
        month: monthNum,
        year: yearNum,
        teamSize: 0,
        totalWorkingDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        unapprovedAbsences: 0,
        attendanceRate: 0,
      };
    }

    const teamUserIds = teamMembers.map((m) => m.userId);

    // Get attendance records for the current month
    const records = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        status: attendanceRecords.status,
        date: attendanceRecords.date,
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

    // Get holidays
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

    // Count working days (excluding weekends and holidays)
    let totalWorkingDays = 0;
    const today = now.getDate();
    for (let d = 1; d <= Math.min(today, lastDay); d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(dateStr);
      const dayOfWeek = dayDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
        totalWorkingDays++;
      }
    }

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let unapprovedAbsences = 0;

    for (const rec of records) {
      const status = rec.status ?? 'absent';
      if (['present', 'wfh', 'work_from_home', 'half_day'].includes(status)) {
        presentDays++;
      } else if (status === 'on_leave' || status === 'leave') {
        leaveDays++;
      } else if (status === 'absent') {
        const d = new Date(rec.date);
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (!isWeekend && !holidayDates.has(rec.date)) {
          unapprovedAbsences++;
        }
        absentDays++;
      }
    }

    const expectedTotalDays = totalWorkingDays * teamMembers.length;
    const attendanceRate =
      expectedTotalDays > 0
        ? Math.round((presentDays / expectedTotalDays) * 10000) / 100
        : 0;

    return {
      month: monthNum,
      year: yearNum,
      teamSize: teamMembers.length,
      totalWorkingDays,
      presentDays,
      absentDays,
      leaveDays,
      unapprovedAbsences,
      attendanceRate,
    };
  }
}
