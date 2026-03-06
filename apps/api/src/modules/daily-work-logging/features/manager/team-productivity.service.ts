import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, count, sum, avg, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamProductivityService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const team = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return team.map((t) => t.userId);
  }

  private async getTeamMembers(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .where(
        and(
          eq(schema.employeeProfiles.managerId, managerId),
          eq(schema.users.orgId, orgId),
          eq(schema.users.isActive, true),
        ),
      );
  }

  async getProductivityMetrics(orgId: string, managerId: string, startDate?: string, endDate?: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { period: { start: startDate ?? null, end: endDate ?? null }, members: [] };
    }

    // Default to current month
    const now = new Date();
    const start = startDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = endDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get timesheet entries for this period
    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        date: schema.timesheetEntries.date,
        hours: schema.timesheetEntries.hours,
        isBillable: schema.timesheetEntries.isBillable,
        projectId: schema.timesheetEntries.projectId,
        description: schema.timesheetEntries.description,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          gte(schema.timesheetEntries.date, start),
          lte(schema.timesheetEntries.date, end),
        ),
      );

    // Get timesheet policy for expected hours
    const [policy] = await this.db
      .select({
        minHoursPerDay: schema.timesheetPolicies.minHoursPerDay,
        minHoursPerWeek: schema.timesheetPolicies.minHoursPerWeek,
      })
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isActive, true),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      );

    const expectedHoursPerDay = policy ? Number(policy.minHoursPerDay) || 8 : 8;

    // Get submission status for the period
    const submissions = await this.db
      .select({
        employeeId: schema.timesheetSubmissions.employeeId,
        status: schema.timesheetSubmissions.status,
        totalHours: schema.timesheetSubmissions.totalHours,
      })
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamUserIds),
          gte(schema.timesheetSubmissions.periodStart, start),
          lte(schema.timesheetSubmissions.periodEnd, end),
        ),
      );

    // Aggregate per employee
    const memberAgg = new Map<string, {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      daysLogged: Set<string>;
      projectIds: Set<string>;
      entryCount: number;
      submissionsApproved: number;
      submissionsRejected: number;
      submissionsTotal: number;
    }>();

    for (const entry of entries) {
      if (!memberAgg.has(entry.employeeId)) {
        memberAgg.set(entry.employeeId, {
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          daysLogged: new Set(),
          projectIds: new Set(),
          entryCount: 0,
          submissionsApproved: 0,
          submissionsRejected: 0,
          submissionsTotal: 0,
        });
      }
      const agg = memberAgg.get(entry.employeeId)!;
      const hrs = Number(entry.hours);
      agg.totalHours += hrs;
      if (entry.isBillable) {
        agg.billableHours += hrs;
      } else {
        agg.nonBillableHours += hrs;
      }
      agg.daysLogged.add(entry.date);
      if (entry.projectId) agg.projectIds.add(entry.projectId);
      agg.entryCount++;
    }

    // Add submission data
    for (const sub of submissions) {
      if (!memberAgg.has(sub.employeeId)) continue;
      const agg = memberAgg.get(sub.employeeId)!;
      agg.submissionsTotal++;
      if (sub.status === 'approved') agg.submissionsApproved++;
      if (sub.status === 'rejected') agg.submissionsRejected++;
    }

    // Calculate working days in the period (excluding weekends)
    const workingDays = countWorkingDays(start, end);
    const expectedTotalHours = workingDays * expectedHoursPerDay;

    const members = teamMembers.map((member) => {
      const agg = memberAgg.get(member.userId) ?? {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        daysLogged: new Set<string>(),
        projectIds: new Set<string>(),
        entryCount: 0,
        submissionsApproved: 0,
        submissionsRejected: 0,
        submissionsTotal: 0,
      };

      const avgHoursPerDay = agg.daysLogged.size > 0
        ? Math.round((agg.totalHours / agg.daysLogged.size) * 100) / 100
        : 0;

      const loggingCompleteness = workingDays > 0
        ? Math.round((agg.daysLogged.size / workingDays) * 10000) / 100
        : 0;

      const hoursCompleteness = expectedTotalHours > 0
        ? Math.round((agg.totalHours / expectedTotalHours) * 10000) / 100
        : 0;

      const approvalRate = agg.submissionsTotal > 0
        ? Math.round((agg.submissionsApproved / agg.submissionsTotal) * 10000) / 100
        : 0;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        totalHours: Math.round(agg.totalHours * 100) / 100,
        billableHours: Math.round(agg.billableHours * 100) / 100,
        nonBillableHours: Math.round(agg.nonBillableHours * 100) / 100,
        daysLogged: agg.daysLogged.size,
        expectedDays: workingDays,
        avgHoursPerDay,
        expectedHoursPerDay,
        loggingCompleteness,
        hoursCompleteness,
        projectCount: agg.projectIds.size,
        entryCount: agg.entryCount,
        approvalRate,
        submissionsApproved: agg.submissionsApproved,
        submissionsRejected: agg.submissionsRejected,
      };
    });

    // Sort by total hours descending
    members.sort((a, b) => b.totalHours - a.totalHours);

    return {
      period: { start, end },
      workingDays,
      expectedHoursPerDay,
      expectedTotalHours,
      teamSize: teamMembers.length,
      members,
    };
  }

  async getUtilizationRate(orgId: string, managerId: string, startDate?: string, endDate?: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return {
        summary: { totalHours: 0, billableHours: 0, nonBillableHours: 0, utilizationRate: 0 },
        members: [],
      };
    }

    // Default to current month
    const now = new Date();
    const start = startDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = endDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        hours: schema.timesheetEntries.hours,
        isBillable: schema.timesheetEntries.isBillable,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          gte(schema.timesheetEntries.date, start),
          lte(schema.timesheetEntries.date, end),
        ),
      );

    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    const memberAgg = new Map<string, { billable: number; nonBillable: number; total: number }>();

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      totalHours += hrs;
      if (entry.isBillable) {
        billableHours += hrs;
      } else {
        nonBillableHours += hrs;
      }

      if (!memberAgg.has(entry.employeeId)) {
        memberAgg.set(entry.employeeId, { billable: 0, nonBillable: 0, total: 0 });
      }
      const agg = memberAgg.get(entry.employeeId)!;
      agg.total += hrs;
      if (entry.isBillable) {
        agg.billable += hrs;
      } else {
        agg.nonBillable += hrs;
      }
    }

    const utilizationRate = totalHours > 0
      ? Math.round((billableHours / totalHours) * 10000) / 100
      : 0;

    const members = teamMembers.map((member) => {
      const agg = memberAgg.get(member.userId) ?? { billable: 0, nonBillable: 0, total: 0 };
      const memberUtilization = agg.total > 0
        ? Math.round((agg.billable / agg.total) * 10000) / 100
        : 0;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        billableHours: Math.round(agg.billable * 100) / 100,
        nonBillableHours: Math.round(agg.nonBillable * 100) / 100,
        totalHours: Math.round(agg.total * 100) / 100,
        utilizationRate: memberUtilization,
      };
    });

    members.sort((a, b) => b.utilizationRate - a.utilizationRate);

    return {
      period: { start, end },
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
        utilizationRate,
      },
      members,
    };
  }

  async getIdleTimeAnalysis(orgId: string, managerId: string, startDate?: string, endDate?: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { members: [] };
    }

    const now = new Date();
    const start = startDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = endDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get expected hours per day from policy
    const [policy] = await this.db
      .select({
        minHoursPerDay: schema.timesheetPolicies.minHoursPerDay,
      })
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isActive, true),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      );

    const expectedHoursPerDay = policy ? Number(policy.minHoursPerDay) || 8 : 8;

    // Get timesheet entries
    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        date: schema.timesheetEntries.date,
        hours: schema.timesheetEntries.hours,
        startTime: schema.timesheetEntries.startTime,
        endTime: schema.timesheetEntries.endTime,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          gte(schema.timesheetEntries.date, start),
          lte(schema.timesheetEntries.date, end),
        ),
      )
      .orderBy(schema.timesheetEntries.date, schema.timesheetEntries.startTime);

    // Get attendance records for comparison
    const attendance = await this.db
      .select({
        employeeId: schema.attendanceRecords.employeeId,
        date: schema.attendanceRecords.date,
        totalWorkMinutes: schema.attendanceRecords.totalWorkMinutes,
        status: schema.attendanceRecords.status,
      })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          inArray(schema.attendanceRecords.employeeId, teamUserIds),
          gte(schema.attendanceRecords.date, start),
          lte(schema.attendanceRecords.date, end),
        ),
      );

    // Build attendance map: employeeId -> date -> totalWorkMinutes
    const attendanceMap = new Map<string, Map<string, number>>();
    for (const rec of attendance) {
      if (!attendanceMap.has(rec.employeeId)) {
        attendanceMap.set(rec.employeeId, new Map());
      }
      if (rec.status === 'present' || rec.status === 'wfh' || rec.status === 'work_from_home') {
        attendanceMap.get(rec.employeeId)!.set(rec.date, rec.totalWorkMinutes ?? 0);
      }
    }

    // Aggregate per employee per day
    const dayAgg = new Map<string, Map<string, { loggedHours: number; gaps: number }>>();

    for (const entry of entries) {
      if (!dayAgg.has(entry.employeeId)) {
        dayAgg.set(entry.employeeId, new Map());
      }
      const empDays = dayAgg.get(entry.employeeId)!;
      if (!empDays.has(entry.date)) {
        empDays.set(entry.date, { loggedHours: 0, gaps: 0 });
      }
      const dayData = empDays.get(entry.date)!;
      dayData.loggedHours += Number(entry.hours);
    }

    // Calculate idle time per employee
    const workingDays = countWorkingDays(start, end);

    const members = teamMembers.map((member) => {
      const empDays = dayAgg.get(member.userId) ?? new Map();
      const empAttendance = attendanceMap.get(member.userId) ?? new Map();

      let totalLoggedHours = 0;
      let totalAttendanceHours = 0;
      let daysWithGaps = 0;
      let totalGapHours = 0;
      let daysNotLogged = 0;

      // For each working day in the period, check for gaps
      const dateIter = new Date(start);
      const endDateObj = new Date(end);

      while (dateIter <= endDateObj) {
        const dayOfWeek = dateIter.getDay();
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateStr = dateIter.toISOString().split('T')[0];
          const dayData = empDays.get(dateStr);
          const attendanceMinutes = empAttendance.get(dateStr) ?? 0;
          const attendanceHours = attendanceMinutes / 60;

          if (dayData) {
            totalLoggedHours += dayData.loggedHours;
            totalAttendanceHours += attendanceHours;

            // Gap = attendance hours - logged hours (if positive)
            const gap = attendanceHours > 0
              ? Math.max(0, attendanceHours - dayData.loggedHours)
              : Math.max(0, expectedHoursPerDay - dayData.loggedHours);

            if (gap > 0.5) { // Only count gaps > 30 min
              daysWithGaps++;
              totalGapHours += gap;
            }
          } else if (attendanceHours > 0) {
            // Present at work but no timesheet entries logged
            daysNotLogged++;
            totalGapHours += attendanceHours;
            totalAttendanceHours += attendanceHours;
          }
        }

        dateIter.setDate(dateIter.getDate() + 1);
      }

      const unaccountedHours = Math.round(totalGapHours * 100) / 100;
      const unaccountedPercentage = (totalAttendanceHours + totalLoggedHours) > 0
        ? Math.round((totalGapHours / Math.max(totalAttendanceHours, totalLoggedHours)) * 10000) / 100
        : 0;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
        totalAttendanceHours: Math.round(totalAttendanceHours * 100) / 100,
        unaccountedHours,
        unaccountedPercentage,
        daysWithGaps,
        daysNotLogged,
        daysLogged: empDays.size,
        workingDays,
      };
    });

    // Sort by unaccounted hours descending (most idle first)
    members.sort((a, b) => b.unaccountedHours - a.unaccountedHours);

    return {
      period: { start, end },
      workingDays,
      expectedHoursPerDay,
      members,
    };
  }

  async getComparison(orgId: string, managerId: string, startDate?: string, endDate?: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { period: { start: startDate ?? null, end: endDate ?? null }, teamAverage: null, members: [] };
    }

    const now = new Date();
    const start = startDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = endDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        date: schema.timesheetEntries.date,
        hours: schema.timesheetEntries.hours,
        isBillable: schema.timesheetEntries.isBillable,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          gte(schema.timesheetEntries.date, start),
          lte(schema.timesheetEntries.date, end),
        ),
      );

    // Aggregate by employee
    const memberAgg = new Map<string, {
      totalHours: number;
      billableHours: number;
      daysLogged: Set<string>;
    }>();

    for (const entry of entries) {
      if (!memberAgg.has(entry.employeeId)) {
        memberAgg.set(entry.employeeId, {
          totalHours: 0,
          billableHours: 0,
          daysLogged: new Set(),
        });
      }
      const agg = memberAgg.get(entry.employeeId)!;
      const hrs = Number(entry.hours);
      agg.totalHours += hrs;
      if (entry.isBillable) agg.billableHours += hrs;
      agg.daysLogged.add(entry.date);
    }

    // Calculate team averages
    const allTotals = Array.from(memberAgg.values());
    const teamTotalHours = allTotals.reduce((acc, a) => acc + a.totalHours, 0);
    const teamBillableHours = allTotals.reduce((acc, a) => acc + a.billableHours, 0);
    const teamDaysLogged = allTotals.reduce((acc, a) => acc + a.daysLogged.size, 0);
    const activeMembers = allTotals.length || 1;

    const teamAvgHours = teamTotalHours / activeMembers;
    const teamAvgBillable = teamBillableHours / activeMembers;
    const teamAvgDaysLogged = teamDaysLogged / activeMembers;
    const teamAvgUtilization = teamTotalHours > 0
      ? (teamBillableHours / teamTotalHours) * 100
      : 0;

    const workingDays = countWorkingDays(start, end);

    const members = teamMembers.map((member) => {
      const agg = memberAgg.get(member.userId) ?? {
        totalHours: 0,
        billableHours: 0,
        daysLogged: new Set<string>(),
      };

      const avgHoursPerDay = agg.daysLogged.size > 0
        ? agg.totalHours / agg.daysLogged.size
        : 0;

      const utilization = agg.totalHours > 0
        ? (agg.billableHours / agg.totalHours) * 100
        : 0;

      // Deviation from team average (positive = above average)
      const hoursDeviation = agg.totalHours - teamAvgHours;
      const utilizationDeviation = utilization - teamAvgUtilization;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        totalHours: Math.round(agg.totalHours * 100) / 100,
        billableHours: Math.round(agg.billableHours * 100) / 100,
        daysLogged: agg.daysLogged.size,
        avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
        utilization: Math.round(utilization * 100) / 100,
        hoursDeviation: Math.round(hoursDeviation * 100) / 100,
        utilizationDeviation: Math.round(utilizationDeviation * 100) / 100,
        performanceRating: getPerformanceRating(agg.totalHours, teamAvgHours),
      };
    });

    // Sort by total hours descending
    members.sort((a, b) => b.totalHours - a.totalHours);

    return {
      period: { start, end },
      workingDays,
      teamAverage: {
        totalHours: Math.round(teamAvgHours * 100) / 100,
        billableHours: Math.round(teamAvgBillable * 100) / 100,
        daysLogged: Math.round(teamAvgDaysLogged * 100) / 100,
        utilization: Math.round(teamAvgUtilization * 100) / 100,
      },
      members,
    };
  }
}

/** Count working days (Monday-Friday) between two dates inclusive. */
function countWorkingDays(startDate: string, endDate: string): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Cap end date at today if endDate is in the future
  const effectiveEnd = end > today ? today : end;

  while (current <= effectiveEnd) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/** Simple performance rating based on deviation from team average. */
function getPerformanceRating(individualHours: number, teamAvgHours: number): string {
  if (teamAvgHours === 0) return 'no_data';
  const ratio = individualHours / teamAvgHours;
  if (ratio >= 1.2) return 'exceeding';
  if (ratio >= 0.9) return 'meeting';
  if (ratio >= 0.7) return 'below';
  return 'significantly_below';
}
