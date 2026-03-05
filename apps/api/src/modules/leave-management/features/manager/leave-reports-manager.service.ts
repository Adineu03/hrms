import { Inject, Injectable } from '@nestjs/common';
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveReportsManagerService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMembersWithNames(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        departmentName: schema.departments.name,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .leftJoin(schema.departments, eq(schema.employeeProfiles.departmentId, schema.departments.id))
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
          eq(schema.users.isActive, true),
        ),
      );
  }

  async getUtilization(orgId: string, managerId: string, startDate: string, endDate: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { startDate, endDate, employees: [] };
    }

    // Get all leave requests (approved) in the date range
    const leaveRequests = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
        leaveTypeId: schema.leaveRequests.leaveTypeId,
        totalDays: schema.leaveRequests.totalDays,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        status: schema.leaveRequests.status,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.toDate, endDate),
          eq(schema.leaveRequests.status, 'approved'),
        ),
      );

    // Aggregate per employee per leave type
    const utilizationMap = new Map<string, Map<string, { name: string; code: string; days: number; count: number }>>();

    for (const req of leaveRequests) {
      if (!utilizationMap.has(req.employeeId)) {
        utilizationMap.set(req.employeeId, new Map());
      }
      const empMap = utilizationMap.get(req.employeeId)!;
      if (!empMap.has(req.leaveTypeId)) {
        empMap.set(req.leaveTypeId, { name: req.leaveTypeName, code: req.leaveTypeCode, days: 0, count: 0 });
      }
      const entry = empMap.get(req.leaveTypeId)!;
      entry.days += Number(req.totalDays);
      entry.count += 1;
    }

    const employees = teamMembers.map((member) => {
      const empUtil = utilizationMap.get(member.userId) ?? new Map();
      const leaveBreakdown = Array.from(empUtil.values()).map((v) => ({
        leaveType: v.name,
        leaveTypeCode: v.code,
        totalDays: v.days,
        requestCount: v.count,
      }));

      const totalDaysTaken = leaveBreakdown.reduce((sum, lb) => sum + lb.totalDays, 0);

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        department: member.departmentName ?? 'Unassigned',
        totalDaysTaken,
        leaveBreakdown,
      };
    });

    // Sort by total days taken descending
    employees.sort((a, b) => b.totalDaysTaken - a.totalDaysTaken);

    return { startDate, endDate, totalEmployees: employees.length, employees };
  }

  async getAbsenteeism(orgId: string, managerId: string, startDate: string, endDate: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { startDate, endDate, employees: [] };
    }

    // Get all approved leaves in the range
    const leaveRequests = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        createdAt: schema.leaveRequests.createdAt,
        leaveTypeName: schema.leaveTypes.name,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.toDate, endDate),
          eq(schema.leaveRequests.status, 'approved'),
        ),
      );

    // Analyze patterns per employee
    const employeeLeaves = new Map<string, any[]>();
    for (const req of leaveRequests) {
      if (!employeeLeaves.has(req.employeeId)) {
        employeeLeaves.set(req.employeeId, []);
      }
      employeeLeaves.get(req.employeeId)!.push(req);
    }

    const employees = teamMembers.map((member) => {
      const leaves = employeeLeaves.get(member.userId) ?? [];
      const totalUnplannedDays = leaves.reduce((sum, l) => {
        // Unplanned = created within 1 day of from_date
        const fromDate = new Date(l.fromDate);
        const createdAt = new Date(l.createdAt);
        const diffMs = fromDate.getTime() - createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays <= 1) {
          return sum + Number(l.totalDays);
        }
        return sum;
      }, 0);

      // Detect Monday/Friday patterns
      let mondayLeaves = 0;
      let fridayLeaves = 0;
      for (const leave of leaves) {
        const from = new Date(leave.fromDate);
        const to = new Date(leave.toDate);
        const current = new Date(from);
        while (current <= to) {
          const day = current.getDay();
          if (day === 1) mondayLeaves++;
          if (day === 5) fridayLeaves++;
          current.setDate(current.getDate() + 1);
        }
      }

      const totalDays = leaves.reduce((sum, l) => sum + Number(l.totalDays), 0);
      const patterns: string[] = [];
      if (mondayLeaves >= 3) patterns.push('Frequent Monday absences');
      if (fridayLeaves >= 3) patterns.push('Frequent Friday absences');
      if (totalUnplannedDays >= 3) patterns.push('High unplanned leave count');

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        department: member.departmentName ?? 'Unassigned',
        totalLeaves: leaves.length,
        totalDays,
        unplannedDays: totalUnplannedDays,
        mondayLeaves,
        fridayLeaves,
        patterns,
        hasPattern: patterns.length > 0,
      };
    });

    // Sort by pattern detection (flagged employees first)
    employees.sort((a, b) => {
      if (a.hasPattern !== b.hasPattern) return a.hasPattern ? -1 : 1;
      return b.totalDays - a.totalDays;
    });

    return {
      startDate,
      endDate,
      totalEmployees: employees.length,
      flaggedCount: employees.filter((e) => e.hasPattern).length,
      employees,
    };
  }

  async getLeaveVsAttendance(orgId: string, managerId: string, startDate: string, endDate: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { startDate, endDate, employees: [] };
    }

    // Get approved leave requests
    const leaveRequests = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
        totalDays: schema.leaveRequests.totalDays,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.toDate, endDate),
          eq(schema.leaveRequests.status, 'approved'),
        ),
      );

    // Get attendance records
    const attendanceRecs = await this.db
      .select({
        employeeId: schema.attendanceRecords.employeeId,
        status: schema.attendanceRecords.status,
        totalWorkMinutes: schema.attendanceRecords.totalWorkMinutes,
        lateMinutes: schema.attendanceRecords.lateMinutes,
      })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          inArray(schema.attendanceRecords.employeeId, teamIds),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    // Aggregate leave days per employee
    const leaveDaysMap = new Map<string, number>();
    for (const req of leaveRequests) {
      leaveDaysMap.set(
        req.employeeId,
        (leaveDaysMap.get(req.employeeId) ?? 0) + Number(req.totalDays),
      );
    }

    // Aggregate attendance per employee
    const attendanceMap = new Map<string, {
      presentDays: number;
      absentDays: number;
      lateDays: number;
      totalWorkHours: number;
    }>();

    for (const rec of attendanceRecs) {
      if (!attendanceMap.has(rec.employeeId)) {
        attendanceMap.set(rec.employeeId, {
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          totalWorkHours: 0,
        });
      }
      const agg = attendanceMap.get(rec.employeeId)!;
      const status = rec.status ?? 'absent';

      if (status === 'present' || status === 'wfh' || status === 'work_from_home' || status === 'half_day') {
        agg.presentDays++;
      } else if (status === 'absent') {
        agg.absentDays++;
      }
      if ((rec.lateMinutes ?? 0) > 0) agg.lateDays++;
      agg.totalWorkHours += Math.round(((rec.totalWorkMinutes ?? 0) / 60) * 100) / 100;
    }

    const employees = teamMembers.map((member) => {
      const leaveDays = leaveDaysMap.get(member.userId) ?? 0;
      const attendance = attendanceMap.get(member.userId) ?? {
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        totalWorkHours: 0,
      };

      const totalTrackedDays = attendance.presentDays + attendance.absentDays + leaveDays;
      const attendanceRate = totalTrackedDays > 0
        ? Math.round((attendance.presentDays / totalTrackedDays) * 100)
        : 0;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        department: member.departmentName ?? 'Unassigned',
        leaveDays,
        presentDays: attendance.presentDays,
        absentDays: attendance.absentDays,
        lateDays: attendance.lateDays,
        totalWorkHours: attendance.totalWorkHours,
        attendanceRate,
      };
    });

    employees.sort((a, b) => a.attendanceRate - b.attendanceRate);

    return { startDate, endDate, totalEmployees: employees.length, employees };
  }

  async exportReport(orgId: string, managerId: string, startDate: string, endDate: string) {
    const utilization = await this.getUtilization(orgId, managerId, startDate, endDate);

    const headers = [
      'Employee Name',
      'Email',
      'Department',
      'Total Days Taken',
      'Leave Breakdown',
    ];

    const rows = utilization.employees.map((emp) => {
      const breakdown = emp.leaveBreakdown
        .map((lb) => `${lb.leaveType}: ${lb.totalDays}d (${lb.requestCount} requests)`)
        .join('; ');

      return [
        emp.employeeName,
        emp.email,
        emp.department,
        emp.totalDaysTaken,
        breakdown,
      ];
    });

    return { startDate, endDate, headers, rows };
  }
}
