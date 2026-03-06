import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SearchNavigationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async search(orgId: string, userId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return { data: [], meta: { total: 0 } };
    }

    const searchTerm = `%${query.trim()}%`;

    // Search across users (firstName, lastName)
    const userResults = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(and(
        eq(schema.users.orgId, orgId),
        eq(schema.users.isActive, true),
        or(
          ilike(schema.users.firstName, searchTerm),
          ilike(schema.users.lastName, searchTerm),
        ),
      ))
      .limit(20);

    const results = userResults.map((u) => ({
      type: 'employee' as const,
      id: u.id,
      title: `${u.firstName} ${u.lastName ?? ''}`.trim(),
      subtitle: u.email,
      path: `/dashboard/employees/${u.id}`,
    }));

    return { data: results, meta: { total: results.length } };
  }

  async getRecentItems(orgId: string, userId: string) {
    // Return recently created bookmarks as "recent items"
    const rows = await this.db
      .select()
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.isActive, true),
      ))
      .orderBy(desc(schema.bookmarks.createdAt))
      .limit(10);

    return { data: rows, meta: { total: rows.length } };
  }

  async listBookmarks(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.isActive, true),
      ))
      .orderBy(schema.bookmarks.sortOrder);

    return { data: rows, meta: { total: rows.length } };
  }

  async createBookmark(
    orgId: string,
    userId: string,
    dto: { title: string; moduleId?: string; path: string; icon?: string },
  ) {
    // Get max sort order for this user
    const maxOrder = await this.db
      .select({ max: sql<number>`coalesce(max(${schema.bookmarks.sortOrder}), 0)` })
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.isActive, true),
      ));

    const [row] = await this.db
      .insert(schema.bookmarks)
      .values({
        orgId,
        userId,
        title: dto.title,
        moduleId: dto.moduleId ?? null,
        path: dto.path,
        icon: dto.icon ?? null,
        sortOrder: Number(maxOrder[0]?.max ?? 0) + 1,
      })
      .returning();

    return { data: row };
  }

  async deleteBookmark(orgId: string, userId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.bookmarks)
      .where(and(
        eq(schema.bookmarks.id, id),
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Bookmark not found');

    const [row] = await this.db
      .update(schema.bookmarks)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.bookmarks.id, id),
        eq(schema.bookmarks.orgId, orgId),
        eq(schema.bookmarks.userId, userId),
      ))
      .returning();

    return { data: row };
  }
}
