import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SearchNavigationConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSearchConfig(orgId: string) {
    // Org-level search configuration stored as computed config
    // Since we don't have a dedicated search_config table, return org-level defaults
    const totalBookmarks = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.bookmarks)
      .where(and(eq(schema.bookmarks.orgId, orgId), eq(schema.bookmarks.isActive, true)));

    return {
      data: {
        globalSearchEnabled: true,
        recentSearchLimit: 10,
        suggestionsEnabled: true,
        moduleSearchScope: ['all'],
        totalOrgBookmarks: Number(totalBookmarks[0]?.count ?? 0),
      },
    };
  }

  async updateSearchConfig(orgId: string, dto: { globalSearchEnabled?: boolean; recentSearchLimit?: number; suggestionsEnabled?: boolean; moduleSearchScope?: string[] }) {
    // In a full implementation, this would persist to an org_settings table
    // For now, return the merged config as acknowledgment
    return {
      data: {
        globalSearchEnabled: dto.globalSearchEnabled ?? true,
        recentSearchLimit: dto.recentSearchLimit ?? 10,
        suggestionsEnabled: dto.suggestionsEnabled ?? true,
        moduleSearchScope: dto.moduleSearchScope ?? ['all'],
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async listGlobalShortcuts(orgId: string) {
    // Admin-managed global shortcuts are bookmarks without a userId filter (org-wide)
    // We use a sentinel userId of '00000000-0000-0000-0000-000000000000' for org-level shortcuts
    const rows = await this.db
      .select()
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, '00000000-0000-0000-0000-000000000000'),
        eq(schema.bookmarks.isActive, true),
      ))
      .orderBy(desc(schema.bookmarks.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createShortcut(orgId: string, dto: { title: string; moduleId?: string; path: string; icon?: string }) {
    // Get max sort order for org-level shortcuts
    const existing = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(${schema.bookmarks.sortOrder}), 0)` })
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, '00000000-0000-0000-0000-000000000000'),
        eq(schema.bookmarks.isActive, true),
      ));

    const nextOrder = Number(existing[0]?.maxOrder ?? 0) + 1;

    const [row] = await this.db
      .insert(schema.bookmarks)
      .values({
        orgId,
        userId: '00000000-0000-0000-0000-000000000000', // org-level sentinel
        title: dto.title,
        moduleId: dto.moduleId ?? null,
        path: dto.path,
        icon: dto.icon ?? null,
        sortOrder: nextOrder,
      })
      .returning();

    return { data: row };
  }

  async deleteShortcut(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.id, id),
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, '00000000-0000-0000-0000-000000000000'),
        eq(schema.bookmarks.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Shortcut not found');

    const [row] = await this.db
      .update(schema.bookmarks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getModuleVisibility(orgId: string) {
    // Return module visibility based on org_modules activation status
    const modules = await this.db
      .select()
      .from(schema.orgModules)
      .where(eq(schema.orgModules.orgId, orgId));

    return {
      data: modules.map((m) => ({
        moduleId: m.moduleId,
        isActive: m.isActive,
        activatedAt: m.activatedAt,
      })),
      meta: { total: modules.length },
    };
  }
}
