import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamNotificationsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));
    return teamMembers.map((m) => m.userId);
  }

  async getTeamNotificationPrefs(orgId: string, managerId: string) {
    // Get the manager's own notification preferences (team-level settings)
    const prefs = await this.db
      .select()
      .from(schema.userPreferences)
      .where(and(
        eq(schema.userPreferences.orgId, orgId),
        eq(schema.userPreferences.userId, managerId),
        eq(schema.userPreferences.isActive, true),
      ));

    if (!prefs.length) {
      return {
        data: {
          userId: managerId,
          notificationPrefs: { email: true, push: true, inApp: true, sms: false },
          teamAlerts: { leaveRequests: true, overtimeRequests: true, attendanceAnomalies: true },
        },
      };
    }

    return {
      data: {
        userId: managerId,
        notificationPrefs: prefs[0].notificationPrefs ?? { email: true, push: true, inApp: true, sms: false },
        teamAlerts: ((prefs[0].notificationPrefs as any)?.teamAlerts) ?? {
          leaveRequests: true,
          overtimeRequests: true,
          attendanceAnomalies: true,
        },
      },
    };
  }

  async updateTeamNotificationPrefs(
    orgId: string,
    managerId: string,
    dto: { notificationPrefs?: Record<string, any>; teamAlerts?: Record<string, any> },
  ) {
    const existing = await this.db
      .select()
      .from(schema.userPreferences)
      .where(and(
        eq(schema.userPreferences.orgId, orgId),
        eq(schema.userPreferences.userId, managerId),
        eq(schema.userPreferences.isActive, true),
      ));

    const currentPrefs = (existing[0]?.notificationPrefs as Record<string, any>) ?? {};
    const updatedPrefs = {
      ...currentPrefs,
      ...dto.notificationPrefs,
      teamAlerts: { ...(currentPrefs.teamAlerts ?? {}), ...dto.teamAlerts },
    };

    if (existing.length) {
      const [row] = await this.db
        .update(schema.userPreferences)
        .set({ notificationPrefs: updatedPrefs, updatedAt: new Date() })
        .where(and(
          eq(schema.userPreferences.id, existing[0].id),
          eq(schema.userPreferences.orgId, orgId),
        ))
        .returning();
      return { data: row };
    }

    const [row] = await this.db
      .insert(schema.userPreferences)
      .values({
        orgId,
        userId: managerId,
        notificationPrefs: updatedPrefs,
      })
      .returning();
    return { data: row };
  }

  async getEscalationRules(orgId: string, managerId: string) {
    // Derive escalation rules from leave policies and timesheet policies
    const leavePolicies = await this.db
      .select({
        id: schema.leavePolicies.id,
        name: schema.leavePolicies.name,
        escalationEnabled: schema.leavePolicies.escalationEnabled,
        escalationHours: schema.leavePolicies.escalationHours,
      })
      .from(schema.leavePolicies)
      .where(and(
        eq(schema.leavePolicies.orgId, orgId),
        eq(schema.leavePolicies.isActive, true),
        eq(schema.leavePolicies.escalationEnabled, true),
      ));

    const timesheetPolicies = await this.db
      .select({
        id: schema.timesheetPolicies.id,
        name: schema.timesheetPolicies.name,
        escalationEnabled: schema.timesheetPolicies.escalationEnabled,
        escalationHours: schema.timesheetPolicies.escalationHours,
      })
      .from(schema.timesheetPolicies)
      .where(and(
        eq(schema.timesheetPolicies.orgId, orgId),
        eq(schema.timesheetPolicies.isActive, true),
        eq(schema.timesheetPolicies.escalationEnabled, true),
      ));

    const rules = [
      ...leavePolicies.map((p) => ({
        type: 'leave_request',
        policyId: p.id,
        policyName: p.name,
        escalationHours: p.escalationHours,
        source: 'leave_policy',
      })),
      ...timesheetPolicies.map((p) => ({
        type: 'timesheet_approval',
        policyId: p.id,
        policyName: p.name,
        escalationHours: p.escalationHours,
        source: 'timesheet_policy',
      })),
    ];

    return { data: rules, meta: { total: rules.length } };
  }

  async createTeamAnnouncement(
    orgId: string,
    managerId: string,
    dto: { title: string; message: string; priority?: string },
  ) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { created: 0, message: 'No team members found' } };
    }

    // Create a notification for each team member
    const notificationValues = teamMemberIds.map((memberId) => ({
      orgId,
      userId: memberId,
      type: dto.priority ?? 'info',
      channel: 'in_app' as const,
      title: dto.title,
      message: dto.message,
      moduleId: 'platform-experience',
      referenceId: managerId as string,
      referenceType: 'team_announcement',
    }));

    const rows = await this.db
      .insert(schema.notifications)
      .values(notificationValues)
      .returning();

    return { data: { created: rows.length, notifications: rows } };
  }

  async listTeamAnnouncements(orgId: string, managerId: string) {
    // Get announcements created by this manager (referenceType = team_announcement)
    const announcements = await this.db
      .select()
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.referenceType, 'team_announcement'),
        eq(schema.notifications.referenceId, managerId),
        eq(schema.notifications.isActive, true),
      ))
      .orderBy(desc(schema.notifications.createdAt));

    // Group by title + message to deduplicate (one notification per member)
    const grouped = new Map<string, { title: string; message: string; type: string; createdAt: Date; recipientCount: number; readCount: number }>();

    for (const ann of announcements) {
      const key = `${ann.title}||${ann.sentAt?.toISOString() ?? ann.createdAt.toISOString()}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.recipientCount += 1;
        if (ann.isRead) existing.readCount += 1;
      } else {
        grouped.set(key, {
          title: ann.title,
          message: ann.message,
          type: ann.type,
          createdAt: ann.createdAt,
          recipientCount: 1,
          readCount: ann.isRead ? 1 : 0,
        });
      }
    }

    const data = Array.from(grouped.values());
    return { data, meta: { total: data.length } };
  }

  async getReadTracking(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get notification read status per team member
    const readStats = await this.db
      .select({
        userId: schema.notifications.userId,
        totalCount: sql<number>`count(*)`,
        readCount: sql<number>`count(*) filter (where ${schema.notifications.isRead} = true)`,
        unreadCount: sql<number>`count(*) filter (where ${schema.notifications.isRead} = false)`,
      })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.isActive, true),
        sql`${schema.notifications.userId} = ANY(${teamMemberIds})`,
      ))
      .groupBy(schema.notifications.userId);

    // Enrich with user names
    const userIds = readStats.map((r) => r.userId);
    const users = userIds.length
      ? await this.db
          .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
          .from(schema.users)
          .where(inArray(schema.users.id, userIds))
      : [];

    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName ?? ''}`.trim()]));

    const data = readStats.map((r) => ({
      userId: r.userId,
      name: userMap.get(r.userId) ?? 'Unknown',
      totalNotifications: Number(r.totalCount),
      readNotifications: Number(r.readCount),
      unreadNotifications: Number(r.unreadCount),
      readRate: Number(r.totalCount) > 0 ? Math.round((Number(r.readCount) / Number(r.totalCount)) * 100) : 0,
    }));

    return { data, meta: { total: data.length } };
  }
}
