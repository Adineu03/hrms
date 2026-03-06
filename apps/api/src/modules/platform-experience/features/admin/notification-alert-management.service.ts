import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class NotificationAlertManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listTemplates(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.notificationTemplates)
      .where(and(eq(schema.notificationTemplates.orgId, orgId), eq(schema.notificationTemplates.isActive, true)))
      .orderBy(desc(schema.notificationTemplates.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createTemplate(orgId: string, dto: { name: string; eventType: string; channel?: string; subject?: string; bodyTemplate: string; variables?: any[] }) {
    const [row] = await this.db
      .insert(schema.notificationTemplates)
      .values({
        orgId,
        name: dto.name,
        eventType: dto.eventType,
        channel: dto.channel ?? 'in_app',
        subject: dto.subject ?? null,
        bodyTemplate: dto.bodyTemplate,
        variables: dto.variables ?? [],
      })
      .returning();

    return { data: row };
  }

  async updateTemplate(orgId: string, id: string, dto: { name?: string; eventType?: string; channel?: string; subject?: string; bodyTemplate?: string; variables?: any[] }) {
    const existing = await this.db
      .select()
      .from(schema.notificationTemplates)
      .where(and(eq(schema.notificationTemplates.id, id), eq(schema.notificationTemplates.orgId, orgId), eq(schema.notificationTemplates.isActive, true)));

    if (!existing.length) throw new NotFoundException('Notification template not found');

    const [row] = await this.db
      .update(schema.notificationTemplates)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.channel !== undefined && { channel: dto.channel }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.bodyTemplate !== undefined && { bodyTemplate: dto.bodyTemplate }),
        ...(dto.variables !== undefined && { variables: dto.variables }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.notificationTemplates.id, id), eq(schema.notificationTemplates.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteTemplate(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.notificationTemplates)
      .where(and(eq(schema.notificationTemplates.id, id), eq(schema.notificationTemplates.orgId, orgId), eq(schema.notificationTemplates.isActive, true)));

    if (!existing.length) throw new NotFoundException('Notification template not found');

    const [row] = await this.db
      .update(schema.notificationTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.notificationTemplates.id, id), eq(schema.notificationTemplates.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async toggleTemplate(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.notificationTemplates)
      .where(and(eq(schema.notificationTemplates.id, id), eq(schema.notificationTemplates.orgId, orgId), eq(schema.notificationTemplates.isActive, true)));

    if (!existing.length) throw new NotFoundException('Notification template not found');

    const currentEnabled = existing[0].isEnabled;

    const [row] = await this.db
      .update(schema.notificationTemplates)
      .set({ isEnabled: !currentEnabled, updatedAt: new Date() })
      .where(and(eq(schema.notificationTemplates.id, id), eq(schema.notificationTemplates.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getNotificationAnalytics(orgId: string) {
    // Total templates
    const allTemplates = await this.db
      .select()
      .from(schema.notificationTemplates)
      .where(and(eq(schema.notificationTemplates.orgId, orgId), eq(schema.notificationTemplates.isActive, true)));

    // Total notifications sent
    const totalNotifications = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.orgId, orgId), eq(schema.notifications.isActive, true)));

    // Read vs unread breakdown
    const readBreakdown = await this.db
      .select({
        isRead: schema.notifications.isRead,
        count: sql<number>`count(*)`,
      })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.orgId, orgId), eq(schema.notifications.isActive, true)))
      .groupBy(schema.notifications.isRead);

    // Channel breakdown
    const channelBreakdown = await this.db
      .select({
        channel: schema.notifications.channel,
        count: sql<number>`count(*)`,
      })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.orgId, orgId), eq(schema.notifications.isActive, true)))
      .groupBy(schema.notifications.channel);

    const total = Number(totalNotifications[0]?.count ?? 0);
    const readCount = readBreakdown.find((r) => r.isRead)?.count ?? 0;
    const unreadCount = readBreakdown.find((r) => !r.isRead)?.count ?? 0;

    return {
      data: {
        totalTemplates: allTemplates.length,
        enabledTemplates: allTemplates.filter((t) => t.isEnabled).length,
        totalNotifications: total,
        readCount: Number(readCount),
        unreadCount: Number(unreadCount),
        readRate: total > 0 ? Math.round((Number(readCount) / total) * 100) : 0,
        channelBreakdown: channelBreakdown.map((c) => ({
          channel: c.channel,
          count: Number(c.count),
        })),
      },
    };
  }
}
