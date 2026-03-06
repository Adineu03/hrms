import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class NotificationCenterService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listNotifications(
    orgId: string,
    userId: string,
    filters?: { type?: string; moduleId?: string; isRead?: boolean },
  ) {
    const conditions = [
      eq(schema.notifications.orgId, orgId),
      eq(schema.notifications.userId, userId),
      eq(schema.notifications.isActive, true),
    ];

    if (filters?.type) {
      conditions.push(eq(schema.notifications.type, filters.type));
    }
    if (filters?.moduleId) {
      conditions.push(eq(schema.notifications.moduleId, filters.moduleId));
    }
    if (filters?.isRead !== undefined) {
      conditions.push(eq(schema.notifications.isRead, filters.isRead));
    }

    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(100);

    return { data: rows, meta: { total: rows.length } };
  }

  async markAsRead(orgId: string, userId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Notification not found');

    const [row] = await this.db
      .update(schema.notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.userId, userId),
      ))
      .returning();

    return { data: row };
  }

  async markAllAsRead(orgId: string, userId: string) {
    const result = await this.db
      .update(schema.notifications)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false),
        eq(schema.notifications.isActive, true),
      ))
      .returning();

    return { data: { markedCount: result.length } };
  }

  async getPreferences(orgId: string, userId: string) {
    const rows = await this.db
      .select({ notificationPrefs: schema.userPreferences.notificationPrefs })
      .from(schema.userPreferences)
      .where(and(
        eq(schema.userPreferences.orgId, orgId),
        eq(schema.userPreferences.userId, userId),
        eq(schema.userPreferences.isActive, true),
      ))
      .limit(1);

    const defaults = { email: true, push: true, inApp: true, sms: false };

    return {
      data: rows.length
        ? { ...defaults, ...(rows[0].notificationPrefs as Record<string, boolean>) }
        : defaults,
    };
  }

  async updatePreferences(
    orgId: string,
    userId: string,
    dto: { email?: boolean; push?: boolean; inApp?: boolean; sms?: boolean },
  ) {
    // Check if preferences exist
    const existing = await this.db
      .select()
      .from(schema.userPreferences)
      .where(and(
        eq(schema.userPreferences.orgId, orgId),
        eq(schema.userPreferences.userId, userId),
        eq(schema.userPreferences.isActive, true),
      ))
      .limit(1);

    if (existing.length) {
      const currentPrefs = (existing[0].notificationPrefs as Record<string, boolean>) ?? {};
      const merged = { ...currentPrefs, ...dto };

      const [row] = await this.db
        .update(schema.userPreferences)
        .set({
          notificationPrefs: merged,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.userPreferences.orgId, orgId),
          eq(schema.userPreferences.userId, userId),
          eq(schema.userPreferences.isActive, true),
        ))
        .returning();

      return { data: row.notificationPrefs };
    }

    // Create new preferences record
    const [row] = await this.db
      .insert(schema.userPreferences)
      .values({
        orgId,
        userId,
        notificationPrefs: { email: true, push: true, inApp: true, sms: false, ...dto },
      })
      .returning();

    return { data: row.notificationPrefs };
  }

  async getHistory(orgId: string, userId: string, pagination?: { page?: number; limit?: number }) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isActive, true),
      ));

    const total = Number(countResult[0]?.count ?? 0);

    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isActive, true),
      ))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
