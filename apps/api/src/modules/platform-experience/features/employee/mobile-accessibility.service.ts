import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MobileAccessibilityService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPreferences(orgId: string, userId: string) {
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
      theme: 'light',
      locale: 'en',
      timezone: null,
      dateFormat: 'DD/MM/YYYY',
      accessibilitySettings: {},
      displayPrefs: {},
    };

    if (!rows.length) return { data: defaults };

    return {
      data: {
        theme: rows[0].theme,
        locale: rows[0].locale,
        timezone: rows[0].timezone,
        dateFormat: rows[0].dateFormat,
        accessibilitySettings: rows[0].accessibilitySettings ?? {},
        displayPrefs: rows[0].displayPrefs ?? {},
      },
    };
  }

  async updatePreferences(
    orgId: string,
    userId: string,
    dto: {
      theme?: string;
      locale?: string;
      timezone?: string;
      dateFormat?: string;
      accessibilitySettings?: Record<string, unknown>;
      displayPrefs?: Record<string, unknown>;
    },
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

      if (dto.theme !== undefined) updates.theme = dto.theme;
      if (dto.locale !== undefined) updates.locale = dto.locale;
      if (dto.timezone !== undefined) updates.timezone = dto.timezone;
      if (dto.dateFormat !== undefined) updates.dateFormat = dto.dateFormat;
      if (dto.accessibilitySettings) {
        updates.accessibilitySettings = {
          ...(existing[0].accessibilitySettings as Record<string, unknown> ?? {}),
          ...dto.accessibilitySettings,
        };
      }
      if (dto.displayPrefs) {
        updates.displayPrefs = {
          ...(existing[0].displayPrefs as Record<string, unknown> ?? {}),
          ...dto.displayPrefs,
        };
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
          theme: row.theme,
          locale: row.locale,
          timezone: row.timezone,
          dateFormat: row.dateFormat,
          accessibilitySettings: row.accessibilitySettings ?? {},
          displayPrefs: row.displayPrefs ?? {},
        },
      };
    }

    // Create new preferences record (upsert)
    const [row] = await this.db
      .insert(schema.userPreferences)
      .values({
        orgId,
        userId,
        theme: dto.theme ?? 'light',
        locale: dto.locale ?? 'en',
        timezone: dto.timezone ?? null,
        dateFormat: dto.dateFormat ?? 'DD/MM/YYYY',
        accessibilitySettings: dto.accessibilitySettings ?? {},
        displayPrefs: dto.displayPrefs ?? {},
      })
      .returning();

    return {
      data: {
        theme: row.theme,
        locale: row.locale,
        timezone: row.timezone,
        dateFormat: row.dateFormat,
        accessibilitySettings: row.accessibilitySettings ?? {},
        displayPrefs: row.displayPrefs ?? {},
      },
    };
  }

  getAvailableThemes() {
    return {
      data: [
        { id: 'light', name: 'Light', description: 'Default light theme' },
        { id: 'dark', name: 'Dark', description: 'Dark mode for reduced eye strain' },
        { id: 'system', name: 'System', description: 'Follow system preference' },
      ],
    };
  }

  getAvailableLocales() {
    return {
      data: [
        { id: 'en', name: 'English', nativeName: 'English' },
        { id: 'hi', name: 'Hindi', nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940' },
        { id: 'es', name: 'Spanish', nativeName: 'Espa\u00F1ol' },
        { id: 'fr', name: 'French', nativeName: 'Fran\u00E7ais' },
        { id: 'de', name: 'German', nativeName: 'Deutsch' },
        { id: 'ja', name: 'Japanese', nativeName: '\u65E5\u672C\u8A9E' },
        { id: 'zh', name: 'Chinese', nativeName: '\u4E2D\u6587' },
      ],
    };
  }
}
