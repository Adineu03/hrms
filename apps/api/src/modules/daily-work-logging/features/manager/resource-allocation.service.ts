import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, count, sum, avg, inArray, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ResourceAllocationService {
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

  async getTeamCapacity(orgId: string, managerId: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return {
        summary: { totalMembers: 0, totalAllocatedPercentage: 0, avgAllocation: 0, overAllocated: 0, underAllocated: 0 },
        members: [],
      };
    }

    // Get active project assignments for team members
    const assignments = await this.db
      .select({
        employeeId: schema.projectAssignments.employeeId,
        projectId: schema.projectAssignments.projectId,
        role: schema.projectAssignments.role,
        allocationPercentage: schema.projectAssignments.allocationPercentage,
        startDate: schema.projectAssignments.startDate,
        endDate: schema.projectAssignments.endDate,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        projectStatus: schema.projects.status,
      })
      .from(schema.projectAssignments)
      .innerJoin(schema.projects, eq(schema.projectAssignments.projectId, schema.projects.id))
      .where(
        and(
          eq(schema.projectAssignments.orgId, orgId),
          inArray(schema.projectAssignments.employeeId, teamUserIds),
          eq(schema.projectAssignments.isActive, true),
        ),
      );

    // Group assignments by employee
    const assignmentMap = new Map<string, typeof assignments>();
    for (const a of assignments) {
      if (!assignmentMap.has(a.employeeId)) {
        assignmentMap.set(a.employeeId, []);
      }
      assignmentMap.get(a.employeeId)!.push(a);
    }

    // Get current month logged hours for actual utilization
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        hours: schema.timesheetEntries.hours,
        projectId: schema.timesheetEntries.projectId,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          gte(schema.timesheetEntries.date, monthStart),
          lte(schema.timesheetEntries.date, monthEnd),
        ),
      );

    // Aggregate logged hours by employee
    const loggedMap = new Map<string, number>();
    for (const entry of entries) {
      loggedMap.set(entry.employeeId, (loggedMap.get(entry.employeeId) ?? 0) + Number(entry.hours));
    }

    // Standard available hours: 8 hrs/day, ~22 working days/month = 176 hrs
    const standardMonthlyHours = 176;

    let overAllocated = 0;
    let underAllocated = 0;

    const members = teamMembers.map((member) => {
      const empAssignments = assignmentMap.get(member.userId) ?? [];
      const totalAllocation = empAssignments.reduce(
        (acc, a) => acc + (Number(a.allocationPercentage) || 0),
        0,
      );
      const allocatedHours = (totalAllocation / 100) * standardMonthlyHours;
      const availableHours = Math.max(0, standardMonthlyHours - allocatedHours);
      const loggedHours = loggedMap.get(member.userId) ?? 0;

      if (totalAllocation > 100) overAllocated++;
      if (totalAllocation < 50) underAllocated++;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        totalAllocationPercentage: Math.round(totalAllocation * 10) / 10,
        allocatedHours: Math.round(allocatedHours * 100) / 100,
        availableHours: Math.round(availableHours * 100) / 100,
        loggedHoursThisMonth: Math.round(loggedHours * 100) / 100,
        isOverAllocated: totalAllocation > 100,
        isUnderAllocated: totalAllocation < 50,
        projectCount: empAssignments.length,
        projects: empAssignments.map((a) => ({
          projectId: a.projectId,
          projectName: a.projectName,
          projectCode: a.projectCode,
          projectStatus: a.projectStatus,
          role: a.role,
          allocationPercentage: Number(a.allocationPercentage) || 0,
          startDate: a.startDate,
          endDate: a.endDate,
        })),
      };
    });

    const totalAllocated = members.reduce((acc, m) => acc + m.totalAllocationPercentage, 0);
    const avgAllocation = members.length > 0
      ? Math.round((totalAllocated / members.length) * 10) / 10
      : 0;

    // Sort by allocation descending
    members.sort((a, b) => b.totalAllocationPercentage - a.totalAllocationPercentage);

    return {
      summary: {
        totalMembers: members.length,
        totalAllocatedPercentage: Math.round(totalAllocated * 10) / 10,
        avgAllocation,
        overAllocated,
        underAllocated,
        standardMonthlyHours,
      },
      members,
    };
  }

  async assignToProject(orgId: string, managerId: string, body: Record<string, any>) {
    const { employeeId, projectId, role, allocationPercentage, startDate, endDate } = body;

    if (!employeeId || !projectId) {
      throw new BadRequestException('employeeId and projectId are required');
    }

    // Verify the employee is a direct report
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(employeeId)) {
      throw new BadRequestException('Employee is not a direct report');
    }

    // Verify project exists
    const [project] = await this.db
      .select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.orgId, orgId),
        ),
      );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if assignment already exists
    const [existing] = await this.db
      .select({ id: schema.projectAssignments.id })
      .from(schema.projectAssignments)
      .where(
        and(
          eq(schema.projectAssignments.orgId, orgId),
          eq(schema.projectAssignments.projectId, projectId),
          eq(schema.projectAssignments.employeeId, employeeId),
          eq(schema.projectAssignments.isActive, true),
        ),
      );

    const now = new Date();

    if (existing) {
      // Update the existing assignment
      await this.db
        .update(schema.projectAssignments)
        .set({
          role: role ?? null,
          allocationPercentage: allocationPercentage ? String(allocationPercentage) : '100',
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          updatedAt: now,
        })
        .where(eq(schema.projectAssignments.id, existing.id));

      return {
        id: existing.id,
        action: 'updated',
        employeeId,
        projectId,
        projectName: project.name,
        role: role ?? null,
        allocationPercentage: allocationPercentage ?? 100,
      };
    }

    // Create new assignment
    const [newAssignment] = await this.db
      .insert(schema.projectAssignments)
      .values({
        orgId,
        projectId,
        employeeId,
        role: role ?? null,
        allocationPercentage: allocationPercentage ? String(allocationPercentage) : '100',
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        isActive: true,
        metadata: {},
      })
      .returning({ id: schema.projectAssignments.id });

    return {
      id: newAssignment.id,
      action: 'created',
      employeeId,
      projectId,
      projectName: project.name,
      role: role ?? null,
      allocationPercentage: allocationPercentage ?? 100,
    };
  }

  async getWorkloadDistribution(orgId: string, managerId: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { distribution: [] };
    }

    // Get current week range
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Get entries for the current week by project
    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        projectId: schema.timesheetEntries.projectId,
        hours: schema.timesheetEntries.hours,
        date: schema.timesheetEntries.date,
        activityType: schema.timesheetEntries.activityType,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          gte(schema.timesheetEntries.date, weekStartStr),
          lte(schema.timesheetEntries.date, weekEndStr),
        ),
      );

    // Get project info
    const projectIds = [...new Set(entries.filter((e) => e.projectId).map((e) => e.projectId!))];
    let projectMap = new Map<string, { name: string; code: string }>();

    if (projectIds.length > 0) {
      const projects = await this.db
        .select({
          id: schema.projects.id,
          name: schema.projects.name,
          code: schema.projects.code,
        })
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.orgId, orgId),
            inArray(schema.projects.id, projectIds),
          ),
        );
      projectMap = new Map(projects.map((p) => [p.id, { name: p.name, code: p.code }]));
    }

    // Aggregate per employee
    const memberWorkload = new Map<string, {
      totalHours: number;
      projectBreakdown: Map<string, number>;
      activityBreakdown: Map<string, number>;
      dailyHours: Map<string, number>;
    }>();

    for (const entry of entries) {
      if (!memberWorkload.has(entry.employeeId)) {
        memberWorkload.set(entry.employeeId, {
          totalHours: 0,
          projectBreakdown: new Map(),
          activityBreakdown: new Map(),
          dailyHours: new Map(),
        });
      }
      const wl = memberWorkload.get(entry.employeeId)!;
      const hrs = Number(entry.hours);
      wl.totalHours += hrs;

      const pKey = entry.projectId ?? '__no_project__';
      wl.projectBreakdown.set(pKey, (wl.projectBreakdown.get(pKey) ?? 0) + hrs);

      const aKey = entry.activityType ?? 'other';
      wl.activityBreakdown.set(aKey, (wl.activityBreakdown.get(aKey) ?? 0) + hrs);

      wl.dailyHours.set(entry.date, (wl.dailyHours.get(entry.date) ?? 0) + hrs);
    }

    const expectedWeeklyHours = 40;

    const distribution = teamMembers.map((member) => {
      const wl = memberWorkload.get(member.userId);
      const totalHours = wl?.totalHours ?? 0;

      const workloadLevel = totalHours >= expectedWeeklyHours * 1.2
        ? 'overloaded'
        : totalHours >= expectedWeeklyHours * 0.8
          ? 'optimal'
          : totalHours >= expectedWeeklyHours * 0.5
            ? 'light'
            : 'idle';

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        weeklyHours: Math.round(totalHours * 100) / 100,
        expectedWeeklyHours,
        loadPercentage: Math.round((totalHours / expectedWeeklyHours) * 10000) / 100,
        workloadLevel,
        projectBreakdown: wl
          ? Array.from(wl.projectBreakdown.entries()).map(([key, hours]) => ({
              projectId: key === '__no_project__' ? null : key,
              projectName: key === '__no_project__'
                ? 'Unassigned'
                : projectMap.get(key)?.name ?? 'Unknown',
              hours: Math.round(hours * 100) / 100,
            }))
          : [],
        activityBreakdown: wl
          ? Array.from(wl.activityBreakdown.entries()).map(([type, hours]) => ({
              activityType: type,
              hours: Math.round(hours * 100) / 100,
            }))
          : [],
        dailyHours: wl
          ? Array.from(wl.dailyHours.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, hours]) => ({
                date,
                hours: Math.round(hours * 100) / 100,
              }))
          : [],
      };
    });

    // Sort by load percentage descending
    distribution.sort((a, b) => b.loadPercentage - a.loadPercentage);

    const overloaded = distribution.filter((d) => d.workloadLevel === 'overloaded').length;
    const optimal = distribution.filter((d) => d.workloadLevel === 'optimal').length;
    const light = distribution.filter((d) => d.workloadLevel === 'light').length;
    const idle = distribution.filter((d) => d.workloadLevel === 'idle').length;

    return {
      period: { start: weekStartStr, end: weekEndStr },
      summary: {
        teamSize: teamMembers.length,
        overloaded,
        optimal,
        light,
        idle,
      },
      distribution,
    };
  }

  async getCapacityPlanning(orgId: string, managerId: string, weeksAhead?: number) {
    const weeks = weeksAhead ?? 4;
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { weeksAhead: weeks, members: [] };
    }

    // Get active project assignments with end dates
    const assignments = await this.db
      .select({
        employeeId: schema.projectAssignments.employeeId,
        projectId: schema.projectAssignments.projectId,
        allocationPercentage: schema.projectAssignments.allocationPercentage,
        startDate: schema.projectAssignments.startDate,
        endDate: schema.projectAssignments.endDate,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
      })
      .from(schema.projectAssignments)
      .innerJoin(schema.projects, eq(schema.projectAssignments.projectId, schema.projects.id))
      .where(
        and(
          eq(schema.projectAssignments.orgId, orgId),
          inArray(schema.projectAssignments.employeeId, teamUserIds),
          eq(schema.projectAssignments.isActive, true),
        ),
      );

    // Build weekly capacity forecast
    const now = new Date();
    const weeklyForecast: Array<{
      weekStart: string;
      weekEnd: string;
      weekNumber: number;
    }> = [];

    for (let w = 0; w < weeks; w++) {
      const wStart = new Date(now);
      // Start from next Monday
      const dayOfWeek = wStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
      wStart.setDate(wStart.getDate() + daysToMonday + (w * 7));
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 4); // Friday

      weeklyForecast.push({
        weekStart: wStart.toISOString().split('T')[0],
        weekEnd: wEnd.toISOString().split('T')[0],
        weekNumber: w + 1,
      });
    }

    const standardWeeklyHours = 40;

    const members = teamMembers.map((member) => {
      const empAssignments = assignments.filter((a) => a.employeeId === member.userId);

      const capacityByWeek = weeklyForecast.map((week) => {
        // Filter assignments active during this week
        const activeAssignments = empAssignments.filter((a) => {
          const aStart = a.startDate ?? '1970-01-01';
          const aEnd = a.endDate ?? '2099-12-31';
          return aStart <= week.weekEnd && aEnd >= week.weekStart;
        });

        const totalAllocation = activeAssignments.reduce(
          (acc, a) => acc + (Number(a.allocationPercentage) || 0),
          0,
        );

        const allocatedHours = (totalAllocation / 100) * standardWeeklyHours;
        const availableHours = Math.max(0, standardWeeklyHours - allocatedHours);

        return {
          weekNumber: week.weekNumber,
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          totalAllocationPercentage: Math.round(totalAllocation * 10) / 10,
          allocatedHours: Math.round(allocatedHours * 100) / 100,
          availableHours: Math.round(availableHours * 100) / 100,
          activeProjectCount: activeAssignments.length,
          projects: activeAssignments.map((a) => ({
            projectName: a.projectName,
            projectCode: a.projectCode,
            allocationPercentage: Number(a.allocationPercentage) || 0,
          })),
        };
      });

      // Projects ending soon (within the forecast window)
      const forecastEnd = weeklyForecast[weeklyForecast.length - 1]?.weekEnd ?? '';
      const endingSoon = empAssignments
        .filter((a) => a.endDate && a.endDate <= forecastEnd && a.endDate >= now.toISOString().split('T')[0])
        .map((a) => ({
          projectName: a.projectName,
          projectCode: a.projectCode,
          endDate: a.endDate,
          allocationPercentage: Number(a.allocationPercentage) || 0,
        }));

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        standardWeeklyHours,
        capacityByWeek,
        projectsEndingSoon: endingSoon,
      };
    });

    return {
      weeksAhead: weeks,
      standardWeeklyHours,
      forecastRange: {
        start: weeklyForecast[0]?.weekStart ?? null,
        end: weeklyForecast[weeklyForecast.length - 1]?.weekEnd ?? null,
      },
      teamSize: members.length,
      members,
    };
  }
}
