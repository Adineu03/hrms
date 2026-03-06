import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, count, sum, avg, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ProjectTrackingService {
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

  async getProjectTimeAllocation(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    if (teamIds.length === 0) {
      return { projects: [] };
    }

    // Get all timesheet entries for team members, grouped by project
    const entries = await this.db
      .select({
        projectId: schema.timesheetEntries.projectId,
        hours: schema.timesheetEntries.hours,
        isBillable: schema.timesheetEntries.isBillable,
        employeeId: schema.timesheetEntries.employeeId,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamIds),
        ),
      );

    // Get all projects in the org for enrichment
    const projects = await this.db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        code: schema.projects.code,
        clientName: schema.projects.clientName,
        budgetHours: schema.projects.budgetHours,
        isBillable: schema.projects.isBillable,
        status: schema.projects.status,
        color: schema.projects.color,
        startDate: schema.projects.startDate,
        endDate: schema.projects.endDate,
      })
      .from(schema.projects)
      .where(eq(schema.projects.orgId, orgId));

    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Aggregate hours by project
    const projectAgg = new Map<string | null, {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      memberIds: Set<string>;
    }>();

    for (const entry of entries) {
      const key = entry.projectId ?? '__no_project__';
      if (!projectAgg.has(key)) {
        projectAgg.set(key, {
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          memberIds: new Set(),
        });
      }
      const agg = projectAgg.get(key)!;
      const hrs = Number(entry.hours);
      agg.totalHours += hrs;
      if (entry.isBillable) {
        agg.billableHours += hrs;
      } else {
        agg.nonBillableHours += hrs;
      }
      agg.memberIds.add(entry.employeeId);
    }

    // Calculate total hours across all projects for percentage allocation
    let grandTotalHours = 0;
    for (const agg of projectAgg.values()) {
      grandTotalHours += agg.totalHours;
    }

    const projectList = Array.from(projectAgg.entries()).map(([key, agg]) => {
      const project = key !== '__no_project__' ? projectMap.get(key!) : null;

      return {
        projectId: key === '__no_project__' ? null : key,
        projectName: project?.name ?? 'Unassigned',
        projectCode: project?.code ?? 'N/A',
        clientName: project?.clientName ?? null,
        color: project?.color ?? '#6B7280',
        status: project?.status ?? null,
        totalHours: Math.round(agg.totalHours * 100) / 100,
        billableHours: Math.round(agg.billableHours * 100) / 100,
        nonBillableHours: Math.round(agg.nonBillableHours * 100) / 100,
        teamMemberCount: agg.memberIds.size,
        allocationPercentage: grandTotalHours > 0
          ? Math.round((agg.totalHours / grandTotalHours) * 10000) / 100
          : 0,
      };
    });

    // Sort by total hours descending
    projectList.sort((a, b) => b.totalHours - a.totalHours);

    return {
      grandTotalHours: Math.round(grandTotalHours * 100) / 100,
      projectCount: projectList.length,
      projects: projectList,
    };
  }

  async getProjectBudget(orgId: string, managerId: string, projectId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    // Get project details
    const [project] = await this.db
      .select()
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

    // Get total hours logged by team on this project
    const entries = await this.db
      .select({
        hours: schema.timesheetEntries.hours,
        isBillable: schema.timesheetEntries.isBillable,
        date: schema.timesheetEntries.date,
        employeeId: schema.timesheetEntries.employeeId,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.projectId, projectId),
          inArray(schema.timesheetEntries.employeeId, teamIds),
        ),
      )
      .orderBy(schema.timesheetEntries.date);

    let actualHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    // Track hours by week for burn rate
    const weeklyHours = new Map<string, number>();

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      actualHours += hrs;
      if (entry.isBillable) {
        billableHours += hrs;
      } else {
        nonBillableHours += hrs;
      }

      // Calculate ISO week key
      const dateObj = new Date(entry.date);
      const yearWeek = getISOWeekKey(dateObj);
      weeklyHours.set(yearWeek, (weeklyHours.get(yearWeek) ?? 0) + hrs);
    }

    const budgetHours = Number(project.budgetHours) || 0;
    const remainingHours = budgetHours - actualHours;
    const burnPercentage = budgetHours > 0
      ? Math.round((actualHours / budgetHours) * 10000) / 100
      : 0;

    // Average weekly burn rate
    const weekCount = weeklyHours.size || 1;
    const avgWeeklyBurn = Math.round((actualHours / weekCount) * 100) / 100;

    // Estimated weeks remaining at current burn rate
    const estimatedWeeksRemaining = avgWeeklyBurn > 0
      ? Math.round((remainingHours / avgWeeklyBurn) * 100) / 100
      : null;

    // Check if over budget
    const isOverBudget = budgetHours > 0 && actualHours > budgetHours;

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        clientName: project.clientName,
        startDate: project.startDate,
        endDate: project.endDate,
        isBillable: project.isBillable,
        billableRate: project.billableRate ? Number(project.billableRate) : null,
        currency: project.currency,
        status: project.status,
      },
      budget: {
        budgetHours: Math.round(budgetHours * 100) / 100,
        actualHours: Math.round(actualHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
        remainingHours: Math.round(remainingHours * 100) / 100,
        burnPercentage,
        isOverBudget,
        avgWeeklyBurn,
        estimatedWeeksRemaining,
      },
      weeklyBreakdown: Array.from(weeklyHours.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, hours]) => ({
          week,
          hours: Math.round(hours * 100) / 100,
        })),
    };
  }

  async getProjectMemberBreakdown(orgId: string, managerId: string, projectId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    // Verify project exists
    const [project] = await this.db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        code: schema.projects.code,
        budgetHours: schema.projects.budgetHours,
      })
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

    if (teamIds.length === 0) {
      return { project: { id: project.id, name: project.name, code: project.code }, members: [] };
    }

    // Get team members info
    const teamMembers = await this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.orgId, orgId),
          inArray(schema.users.id, teamIds),
        ),
      );

    const memberMap = new Map(teamMembers.map((m) => [m.userId, m]));

    // Get entries for this project by team members
    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        hours: schema.timesheetEntries.hours,
        isBillable: schema.timesheetEntries.isBillable,
        date: schema.timesheetEntries.date,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.projectId, projectId),
          inArray(schema.timesheetEntries.employeeId, teamIds),
        ),
      );

    // Aggregate by employee
    const memberAgg = new Map<string, {
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      firstEntry: string;
      lastEntry: string;
      dayCount: Set<string>;
    }>();

    for (const entry of entries) {
      if (!memberAgg.has(entry.employeeId)) {
        memberAgg.set(entry.employeeId, {
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          firstEntry: entry.date,
          lastEntry: entry.date,
          dayCount: new Set(),
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
      agg.dayCount.add(entry.date);
      if (entry.date < agg.firstEntry) agg.firstEntry = entry.date;
      if (entry.date > agg.lastEntry) agg.lastEntry = entry.date;
    }

    // Get project assignments for roles
    const assignments = await this.db
      .select({
        employeeId: schema.projectAssignments.employeeId,
        role: schema.projectAssignments.role,
        allocationPercentage: schema.projectAssignments.allocationPercentage,
      })
      .from(schema.projectAssignments)
      .where(
        and(
          eq(schema.projectAssignments.orgId, orgId),
          eq(schema.projectAssignments.projectId, projectId),
          inArray(schema.projectAssignments.employeeId, teamIds),
        ),
      );

    const assignmentMap = new Map(assignments.map((a) => [a.employeeId, a]));

    const members = Array.from(memberAgg.entries()).map(([employeeId, agg]) => {
      const member = memberMap.get(employeeId);
      const assignment = assignmentMap.get(employeeId);

      return {
        employeeId,
        employeeName: member
          ? `${member.firstName} ${member.lastName ?? ''}`.trim()
          : 'Unknown',
        email: member?.email ?? null,
        role: assignment?.role ?? null,
        allocationPercentage: assignment ? Number(assignment.allocationPercentage) : null,
        totalHours: Math.round(agg.totalHours * 100) / 100,
        billableHours: Math.round(agg.billableHours * 100) / 100,
        nonBillableHours: Math.round(agg.nonBillableHours * 100) / 100,
        daysWorked: agg.dayCount.size,
        avgHoursPerDay: agg.dayCount.size > 0
          ? Math.round((agg.totalHours / agg.dayCount.size) * 100) / 100
          : 0,
        firstEntry: agg.firstEntry,
        lastEntry: agg.lastEntry,
      };
    });

    // Sort by total hours descending
    members.sort((a, b) => b.totalHours - a.totalHours);

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        budgetHours: Number(project.budgetHours) || 0,
      },
      totalTeamHours: Math.round(members.reduce((acc, m) => acc + m.totalHours, 0) * 100) / 100,
      memberCount: members.length,
      members,
    };
  }

  async getBillableTracking(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    if (teamIds.length === 0) {
      return {
        summary: { totalHours: 0, billableHours: 0, nonBillableHours: 0, utilizationPercentage: 0 },
        byProject: [],
        byMember: [],
      };
    }

    // Get current month range
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get entries for the current month
    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        projectId: schema.timesheetEntries.projectId,
        hours: schema.timesheetEntries.hours,
        isBillable: schema.timesheetEntries.isBillable,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamIds),
          gte(schema.timesheetEntries.date, monthStart),
          lte(schema.timesheetEntries.date, monthEnd),
        ),
      );

    // Get project details for enrichment
    const projectIds = [...new Set(entries.filter((e) => e.projectId).map((e) => e.projectId!))];
    let projectMap = new Map<string, { name: string; code: string; billableRate: string | null }>();

    if (projectIds.length > 0) {
      const projects = await this.db
        .select({
          id: schema.projects.id,
          name: schema.projects.name,
          code: schema.projects.code,
          billableRate: schema.projects.billableRate,
        })
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.orgId, orgId),
            inArray(schema.projects.id, projectIds),
          ),
        );
      projectMap = new Map(projects.map((p) => [p.id, { name: p.name, code: p.code, billableRate: p.billableRate }]));
    }

    // Get team member info
    const memberInfo = await this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.orgId, orgId),
          inArray(schema.users.id, teamIds),
        ),
      );
    const memberMap = new Map(memberInfo.map((m) => [m.userId, m]));

    // Aggregate totals
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    // Aggregate by project
    const byProjectAgg = new Map<string, { billable: number; nonBillable: number }>();
    // Aggregate by member
    const byMemberAgg = new Map<string, { billable: number; nonBillable: number; total: number }>();

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      totalHours += hrs;

      if (entry.isBillable) {
        billableHours += hrs;
      } else {
        nonBillableHours += hrs;
      }

      // By project
      const pKey = entry.projectId ?? '__no_project__';
      if (!byProjectAgg.has(pKey)) {
        byProjectAgg.set(pKey, { billable: 0, nonBillable: 0 });
      }
      const projAgg = byProjectAgg.get(pKey)!;
      if (entry.isBillable) {
        projAgg.billable += hrs;
      } else {
        projAgg.nonBillable += hrs;
      }

      // By member
      if (!byMemberAgg.has(entry.employeeId)) {
        byMemberAgg.set(entry.employeeId, { billable: 0, nonBillable: 0, total: 0 });
      }
      const memAgg = byMemberAgg.get(entry.employeeId)!;
      memAgg.total += hrs;
      if (entry.isBillable) {
        memAgg.billable += hrs;
      } else {
        memAgg.nonBillable += hrs;
      }
    }

    const utilizationPercentage = totalHours > 0
      ? Math.round((billableHours / totalHours) * 10000) / 100
      : 0;

    // Build project breakdown
    const byProject = Array.from(byProjectAgg.entries()).map(([key, agg]) => {
      const project = key !== '__no_project__' ? projectMap.get(key) : null;
      const projTotal = agg.billable + agg.nonBillable;
      const rate = project?.billableRate ? Number(project.billableRate) : 0;

      return {
        projectId: key === '__no_project__' ? null : key,
        projectName: project?.name ?? 'Unassigned',
        projectCode: project?.code ?? 'N/A',
        billableHours: Math.round(agg.billable * 100) / 100,
        nonBillableHours: Math.round(agg.nonBillable * 100) / 100,
        totalHours: Math.round(projTotal * 100) / 100,
        utilizationPercentage: projTotal > 0
          ? Math.round((agg.billable / projTotal) * 10000) / 100
          : 0,
        estimatedRevenue: rate > 0 ? Math.round(agg.billable * rate * 100) / 100 : null,
      };
    });

    byProject.sort((a, b) => b.billableHours - a.billableHours);

    // Build member breakdown
    const byMember = Array.from(byMemberAgg.entries()).map(([employeeId, agg]) => {
      const member = memberMap.get(employeeId);

      return {
        employeeId,
        employeeName: member
          ? `${member.firstName} ${member.lastName ?? ''}`.trim()
          : 'Unknown',
        billableHours: Math.round(agg.billable * 100) / 100,
        nonBillableHours: Math.round(agg.nonBillable * 100) / 100,
        totalHours: Math.round(agg.total * 100) / 100,
        utilizationPercentage: agg.total > 0
          ? Math.round((agg.billable / agg.total) * 10000) / 100
          : 0,
      };
    });

    byMember.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

    return {
      period: { start: monthStart, end: monthEnd },
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        nonBillableHours: Math.round(nonBillableHours * 100) / 100,
        utilizationPercentage,
      },
      byProject,
      byMember,
    };
  }
}

/** Returns an ISO-week key like "2026-W10" */
function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
