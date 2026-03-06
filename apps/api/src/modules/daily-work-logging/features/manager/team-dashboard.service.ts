import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, count, sum, avg, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamDashboardService {
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
        departmentName: schema.departments.name,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .leftJoin(schema.departments, eq(schema.employeeProfiles.departmentId, schema.departments.id))
      .where(
        and(
          eq(schema.employeeProfiles.managerId, managerId),
          eq(schema.users.orgId, orgId),
          eq(schema.users.isActive, true),
        ),
      );
  }

  async getTeamSubmissionStatus(orgId: string, managerId: string, periodStart?: string, periodEnd?: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return {
        period: { start: periodStart ?? null, end: periodEnd ?? null },
        summary: { total: 0, submitted: 0, approved: 0, rejected: 0, draft: 0, notStarted: 0 },
        members: [],
      };
    }

    // Default to current week if no period specified
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const pStart = periodStart ?? weekStart.toISOString().split('T')[0];
    const pEnd = periodEnd ?? weekEnd.toISOString().split('T')[0];

    // Get submissions for this period
    const submissions = await this.db
      .select({
        id: schema.timesheetSubmissions.id,
        employeeId: schema.timesheetSubmissions.employeeId,
        periodStart: schema.timesheetSubmissions.periodStart,
        periodEnd: schema.timesheetSubmissions.periodEnd,
        totalHours: schema.timesheetSubmissions.totalHours,
        billableHours: schema.timesheetSubmissions.billableHours,
        nonBillableHours: schema.timesheetSubmissions.nonBillableHours,
        status: schema.timesheetSubmissions.status,
        submittedAt: schema.timesheetSubmissions.submittedAt,
        approvedAt: schema.timesheetSubmissions.approvedAt,
        rejectedAt: schema.timesheetSubmissions.rejectedAt,
      })
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamUserIds),
          gte(schema.timesheetSubmissions.periodStart, pStart),
          lte(schema.timesheetSubmissions.periodEnd, pEnd),
        ),
      );

    // Build submission map by employeeId
    const submissionMap = new Map<string, typeof submissions[0]>();
    for (const sub of submissions) {
      submissionMap.set(sub.employeeId, sub);
    }

    let submitted = 0;
    let approved = 0;
    let rejected = 0;
    let draft = 0;
    let notStarted = 0;

    const members = teamMembers.map((member) => {
      const sub = submissionMap.get(member.userId);
      let status = 'not_started';

      if (sub) {
        status = sub.status;
        switch (sub.status) {
          case 'submitted':
            submitted++;
            break;
          case 'approved':
            approved++;
            break;
          case 'rejected':
            rejected++;
            break;
          case 'draft':
            draft++;
            break;
          default:
            notStarted++;
            break;
        }
      } else {
        notStarted++;
      }

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        departmentName: member.departmentName ?? 'Unassigned',
        status,
        submissionId: sub?.id ?? null,
        totalHours: sub ? Number(sub.totalHours) : 0,
        billableHours: sub ? Number(sub.billableHours) : 0,
        nonBillableHours: sub ? Number(sub.nonBillableHours) : 0,
        submittedAt: sub?.submittedAt ?? null,
        approvedAt: sub?.approvedAt ?? null,
        rejectedAt: sub?.rejectedAt ?? null,
      };
    });

    return {
      period: { start: pStart, end: pEnd },
      summary: {
        total: teamMembers.length,
        submitted,
        approved,
        rejected,
        draft,
        notStarted,
      },
      members,
    };
  }

  async getHoursSummary(orgId: string, managerId: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { members: [] };
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Week boundaries (Sunday to Saturday)
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Month boundaries
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Get all entries for the current month (which includes today and the current week)
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
          gte(schema.timesheetEntries.date, monthStart),
          lte(schema.timesheetEntries.date, today),
        ),
      );

    // Aggregate per employee
    const summaryMap = new Map<string, {
      todayHours: number;
      todayBillable: number;
      weekHours: number;
      weekBillable: number;
      monthHours: number;
      monthBillable: number;
    }>();

    for (const entry of entries) {
      if (!teamUserIds.includes(entry.employeeId)) continue;

      if (!summaryMap.has(entry.employeeId)) {
        summaryMap.set(entry.employeeId, {
          todayHours: 0,
          todayBillable: 0,
          weekHours: 0,
          weekBillable: 0,
          monthHours: 0,
          monthBillable: 0,
        });
      }

      const s = summaryMap.get(entry.employeeId)!;
      const hrs = Number(entry.hours);

      // Month totals (all entries are within the month)
      s.monthHours += hrs;
      if (entry.isBillable) s.monthBillable += hrs;

      // Week totals
      if (entry.date >= weekStartStr && entry.date <= today) {
        s.weekHours += hrs;
        if (entry.isBillable) s.weekBillable += hrs;
      }

      // Today totals
      if (entry.date === today) {
        s.todayHours += hrs;
        if (entry.isBillable) s.todayBillable += hrs;
      }
    }

    const members = teamMembers.map((member) => {
      const s = summaryMap.get(member.userId) ?? {
        todayHours: 0,
        todayBillable: 0,
        weekHours: 0,
        weekBillable: 0,
        monthHours: 0,
        monthBillable: 0,
      };

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        departmentName: member.departmentName ?? 'Unassigned',
        today: {
          totalHours: Math.round(s.todayHours * 100) / 100,
          billableHours: Math.round(s.todayBillable * 100) / 100,
        },
        week: {
          totalHours: Math.round(s.weekHours * 100) / 100,
          billableHours: Math.round(s.weekBillable * 100) / 100,
        },
        month: {
          totalHours: Math.round(s.monthHours * 100) / 100,
          billableHours: Math.round(s.monthBillable * 100) / 100,
        },
      };
    });

    return { members };
  }

  async getTodayView(orgId: string, managerId: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { date: new Date().toISOString().split('T')[0], members: [] };
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's timesheet entries for team members
    const entries = await this.db
      .select({
        id: schema.timesheetEntries.id,
        employeeId: schema.timesheetEntries.employeeId,
        hours: schema.timesheetEntries.hours,
        description: schema.timesheetEntries.description,
        startTime: schema.timesheetEntries.startTime,
        endTime: schema.timesheetEntries.endTime,
        isBillable: schema.timesheetEntries.isBillable,
        activityType: schema.timesheetEntries.activityType,
        status: schema.timesheetEntries.status,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        taskCategoryName: schema.taskCategories.name,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.projects, eq(schema.timesheetEntries.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timesheetEntries.taskCategoryId, schema.taskCategories.id))
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          eq(schema.timesheetEntries.date, today),
        ),
      )
      .orderBy(desc(schema.timesheetEntries.createdAt));

    // Group entries by employee
    const entryMap = new Map<string, typeof entries>();
    for (const entry of entries) {
      if (!entryMap.has(entry.employeeId)) {
        entryMap.set(entry.employeeId, []);
      }
      entryMap.get(entry.employeeId)!.push(entry);
    }

    // Check for active timer sessions
    const activeSessions = await this.db
      .select({
        employeeId: schema.timerSessions.employeeId,
        description: schema.timerSessions.description,
        startTime: schema.timerSessions.startTime,
        isRunning: schema.timerSessions.isRunning,
        isPaused: schema.timerSessions.isPaused,
        projectName: schema.projects.name,
      })
      .from(schema.timerSessions)
      .leftJoin(schema.projects, eq(schema.timerSessions.projectId, schema.projects.id))
      .where(
        and(
          eq(schema.timerSessions.orgId, orgId),
          inArray(schema.timerSessions.employeeId, teamUserIds),
          eq(schema.timerSessions.isRunning, true),
        ),
      );

    const activeTimerMap = new Map<string, typeof activeSessions[0]>();
    for (const session of activeSessions) {
      activeTimerMap.set(session.employeeId, session);
    }

    const members = teamMembers.map((member) => {
      const empEntries = entryMap.get(member.userId) ?? [];
      const activeTimer = activeTimerMap.get(member.userId) ?? null;

      const totalHours = empEntries.reduce((acc, e) => acc + Number(e.hours), 0);
      const billableHours = empEntries
        .filter((e) => e.isBillable)
        .reduce((acc, e) => acc + Number(e.hours), 0);

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        departmentName: member.departmentName ?? 'Unassigned',
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        entryCount: empEntries.length,
        entries: empEntries.map((e) => ({
          id: e.id,
          hours: Number(e.hours),
          description: e.description,
          startTime: e.startTime,
          endTime: e.endTime,
          isBillable: e.isBillable,
          activityType: e.activityType,
          status: e.status,
          projectName: e.projectName,
          projectCode: e.projectCode,
          taskCategory: e.taskCategoryName,
        })),
        activeTimer: activeTimer
          ? {
              description: activeTimer.description,
              startTime: activeTimer.startTime,
              projectName: activeTimer.projectName,
              isPaused: activeTimer.isPaused,
            }
          : null,
      };
    });

    return {
      date: today,
      teamSize: teamMembers.length,
      membersWithEntries: members.filter((m) => m.entryCount > 0).length,
      membersWithActiveTimers: members.filter((m) => m.activeTimer !== null).length,
      members,
    };
  }
}
