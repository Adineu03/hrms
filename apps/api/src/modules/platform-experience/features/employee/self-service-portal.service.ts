import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SelfServicePortalService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getRequestSummary(orgId: string, userId: string) {
    const result = await this.db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(case when ${schema.selfServiceRequests.status} = 'pending' then 1 end)`,
        approved: sql<number>`count(case when ${schema.selfServiceRequests.status} = 'approved' then 1 end)`,
        rejected: sql<number>`count(case when ${schema.selfServiceRequests.status} = 'rejected' then 1 end)`,
      })
      .from(schema.selfServiceRequests)
      .where(and(
        eq(schema.selfServiceRequests.orgId, orgId),
        eq(schema.selfServiceRequests.employeeId, userId),
      ));

    return {
      data: {
        total: Number(result[0]?.total ?? 0),
        pending: Number(result[0]?.pending ?? 0),
        approved: Number(result[0]?.approved ?? 0),
        rejected: Number(result[0]?.rejected ?? 0),
      },
    };
  }

  async listRequests(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.selfServiceRequests)
      .where(and(
        eq(schema.selfServiceRequests.orgId, orgId),
        eq(schema.selfServiceRequests.employeeId, userId),
      ))
      .orderBy(desc(schema.selfServiceRequests.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async listDocuments(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.documents)
      .where(and(
        eq(schema.documents.orgId, orgId),
        eq(schema.documents.employeeId, userId),
      ))
      .orderBy(desc(schema.documents.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async getSettings(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.userPreferences)
      .where(and(
        eq(schema.userPreferences.orgId, orgId),
        eq(schema.userPreferences.userId, userId),
        eq(schema.userPreferences.isActive, true),
      ))
      .limit(1);

    const defaults = {
      displayPrefs: {},
      accessibilitySettings: {},
    };

    if (!rows.length) return { data: defaults };

    return {
      data: {
        displayPrefs: rows[0].displayPrefs ?? {},
        accessibilitySettings: rows[0].accessibilitySettings ?? {},
      },
    };
  }

  async updateSettings(
    orgId: string,
    userId: string,
    dto: { displayPrefs?: Record<string, unknown>; accessibilitySettings?: Record<string, unknown> },
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
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (dto.displayPrefs) {
        updates.displayPrefs = { ...(existing[0].displayPrefs as Record<string, unknown> ?? {}), ...dto.displayPrefs };
      }
      if (dto.accessibilitySettings) {
        updates.accessibilitySettings = { ...(existing[0].accessibilitySettings as Record<string, unknown> ?? {}), ...dto.accessibilitySettings };
      }

      const [row] = await this.db
        .update(schema.userPreferences)
        .set(updates)
        .where(and(
          eq(schema.userPreferences.orgId, orgId),
          eq(schema.userPreferences.userId, userId),
          eq(schema.userPreferences.isActive, true),
        ))
        .returning();

      return {
        data: {
          displayPrefs: row.displayPrefs ?? {},
          accessibilitySettings: row.accessibilitySettings ?? {},
        },
      };
    }

    // Create new preferences record
    const [row] = await this.db
      .insert(schema.userPreferences)
      .values({
        orgId,
        userId,
        displayPrefs: dto.displayPrefs ?? {},
        accessibilitySettings: dto.accessibilitySettings ?? {},
      })
      .returning();

    return {
      data: {
        displayPrefs: row.displayPrefs ?? {},
        accessibilitySettings: row.accessibilitySettings ?? {},
      },
    };
  }
}
