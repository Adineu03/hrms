import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class QuickActionsService {
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

  async getQuickActions(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return {
        data: {
          teamSize: 0,
          pendingLeaveRequests: 0,
          pendingOvertimeRequests: 0,
          unreadNotifications: 0,
          teamAnnouncements: 0,
        },
      };
    }

    // Count pending leave requests from team members
    const pendingLeaves = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.leaveRequests)
      .where(and(
        eq(schema.leaveRequests.orgId, orgId),
        eq(schema.leaveRequests.status, 'pending'),
                sql`${schema.leaveRequests.employeeId} = ANY(${teamMemberIds})`,
      ));

    // Count pending overtime requests from team members
    const pendingOvertime = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.overtimeRequests)
      .where(and(
        eq(schema.overtimeRequests.orgId, orgId),
        eq(schema.overtimeRequests.status, 'pending'),
                sql`${schema.overtimeRequests.employeeId} = ANY(${teamMemberIds})`,
      ));

    // Count manager's own unread notifications
    const unreadNotifs = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.userId, managerId),
        eq(schema.notifications.isRead, false),
        eq(schema.notifications.isActive, true),
      ));

    // Count team announcements sent by manager
    const teamAnnouncements = await this.db
      .select({ count: sql<number>`count(distinct ${schema.notifications.sentAt})` })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.referenceType, 'team_announcement'),
        eq(schema.notifications.referenceId, managerId),
        eq(schema.notifications.isActive, true),
      ));

    return {
      data: {
        teamSize: teamMemberIds.length,
        pendingLeaveRequests: Number(pendingLeaves[0]?.count ?? 0),
        pendingOvertimeRequests: Number(pendingOvertime[0]?.count ?? 0),
        unreadNotifications: Number(unreadNotifs[0]?.count ?? 0),
        teamAnnouncements: Number(teamAnnouncements[0]?.count ?? 0),
      },
    };
  }

  async getRecentItems(orgId: string, userId: string) {
    // Return the user's bookmarks as recently accessed items
    const bookmarkItems = await this.db
      .select()
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.isActive, true),
      ))
      .orderBy(desc(schema.bookmarks.updatedAt))
      .limit(10);

    // Also return recent notifications as activity items
    const recentNotifs = await this.db
      .select()
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isActive, true),
      ))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(10);

    return {
      data: {
        bookmarks: bookmarkItems.map((b) => ({
          id: b.id,
          title: b.title,
          path: b.path,
          moduleId: b.moduleId,
          icon: b.icon,
          lastAccessed: b.updatedAt,
        })),
        recentActivity: recentNotifs.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          moduleId: n.moduleId,
          isRead: n.isRead,
          createdAt: n.createdAt,
        })),
      },
    };
  }

  async bulkApprove(
    orgId: string,
    managerId: string,
    dto: { type: string; ids: string[] },
  ) {
    if (!dto.ids.length) {
      return { data: { approved: 0, type: dto.type } };
    }

    let approvedCount = 0;

    if (dto.type === 'leave_request') {
      const result = await this.db
        .update(schema.leaveRequests)
        .set({
          status: 'approved',
          approvedBy: managerId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.status, 'pending'),
                    inArray(schema.leaveRequests.id, dto.ids),
        ))
        .returning();

      approvedCount = result.length;

      // Create notifications for approved leave requests
      if (result.length) {
        const notifValues = result.map((lr) => ({
          orgId,
          userId: lr.employeeId,
          type: 'success' as const,
          channel: 'in_app' as const,
          title: 'Leave Request Approved',
          message: `Your leave request from ${lr.fromDate} to ${lr.toDate} has been approved.`,
          moduleId: 'leave-management',
          referenceId: lr.id,
          referenceType: 'leave_request',
        }));
        await this.db.insert(schema.notifications).values(notifValues);
      }
    } else if (dto.type === 'overtime_request') {
      const result = await this.db
        .update(schema.overtimeRequests)
        .set({
          status: 'approved',
          reviewedBy: managerId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.status, 'pending'),
                    inArray(schema.overtimeRequests.id, dto.ids),
        ))
        .returning();

      approvedCount = result.length;

      // Create notifications for approved overtime requests
      if (result.length) {
        const notifValues = result.map((or) => ({
          orgId,
          userId: or.employeeId,
          type: 'success' as const,
          channel: 'in_app' as const,
          title: 'Overtime Request Approved',
          message: `Your overtime request for ${or.date} has been approved.`,
          moduleId: 'attendance',
          referenceId: or.id,
          referenceType: 'overtime_request',
        }));
        await this.db.insert(schema.notifications).values(notifValues);
      }
    }

    return { data: { approved: approvedCount, type: dto.type } };
  }

  async getPendingApprovals(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { leaveRequests: [], overtimeRequests: [] }, meta: { total: 0 } };
    }

    // Get pending leave requests from team
    const pendingLeaves = await this.db
      .select({
        request: schema.leaveRequests,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.users, eq(schema.leaveRequests.employeeId, schema.users.id))
      .where(and(
        eq(schema.leaveRequests.orgId, orgId),
        eq(schema.leaveRequests.status, 'pending'),
                sql`${schema.leaveRequests.employeeId} = ANY(${teamMemberIds})`,
      ))
      .orderBy(desc(schema.leaveRequests.createdAt));

    // Get pending overtime requests from team
    const pendingOvertime = await this.db
      .select({
        request: schema.overtimeRequests,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.overtimeRequests)
      .innerJoin(schema.users, eq(schema.overtimeRequests.employeeId, schema.users.id))
      .where(and(
        eq(schema.overtimeRequests.orgId, orgId),
        eq(schema.overtimeRequests.status, 'pending'),
                sql`${schema.overtimeRequests.employeeId} = ANY(${teamMemberIds})`,
      ))
      .orderBy(desc(schema.overtimeRequests.createdAt));

    const leaveData = pendingLeaves.map((l) => ({
      ...l.request,
      employeeName: `${l.firstName} ${l.lastName ?? ''}`.trim(),
    }));

    const overtimeData = pendingOvertime.map((o) => ({
      ...o.request,
      employeeName: `${o.firstName} ${o.lastName ?? ''}`.trim(),
    }));

    return {
      data: {
        leaveRequests: leaveData,
        overtimeRequests: overtimeData,
      },
      meta: { total: leaveData.length + overtimeData.length },
    };
  }
}
