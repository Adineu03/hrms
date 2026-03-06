import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SocialCommunityService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSocialFeed(orgId: string) {
    const posts = await this.db
      .select({
        post: schema.socialPosts,
        authorName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.socialPosts)
      .leftJoin(schema.users, eq(schema.socialPosts.authorId, schema.users.id))
      .where(and(
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.isActive, true),
      ))
      .orderBy(desc(schema.socialPosts.createdAt))
      .limit(50);

    return {
      data: posts.map((p) => ({
        ...p.post,
        authorName: p.authorName,
      })),
      meta: { total: posts.length },
    };
  }

  async createPost(orgId: string, userId: string, dto: { type?: string; content: string; groupId?: string }) {
    const [row] = await this.db
      .insert(schema.socialPosts)
      .values({
        orgId,
        authorId: userId,
        type: dto.type ?? 'post',
        content: dto.content,
        groupId: dto.groupId ?? null,
      })
      .returning();

    return { data: row };
  }

  async likePost(orgId: string, userId: string, postId: string) {
    const existing = await this.db
      .select()
      .from(schema.socialPosts)
      .where(and(
        eq(schema.socialPosts.id, postId),
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Post not found');

    const [row] = await this.db
      .update(schema.socialPosts)
      .set({
        likesCount: sql`${schema.socialPosts.likesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.socialPosts.id, postId), eq(schema.socialPosts.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async listGroups(orgId: string) {
    const groups = await this.db
      .select()
      .from(schema.socialGroups)
      .where(and(eq(schema.socialGroups.orgId, orgId), eq(schema.socialGroups.isActive, true)))
      .orderBy(desc(schema.socialGroups.createdAt));

    return { data: groups, meta: { total: groups.length } };
  }

  async createGroup(orgId: string, userId: string, dto: { name: string; description?: string; type?: string }) {
    const [row] = await this.db
      .insert(schema.socialGroups)
      .values({
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type ?? 'interest',
        createdBy: userId,
        memberCount: 1,
      })
      .returning();

    return { data: row };
  }

  async joinGroup(orgId: string, userId: string, groupId: string) {
    const existing = await this.db
      .select()
      .from(schema.socialGroups)
      .where(and(
        eq(schema.socialGroups.id, groupId),
        eq(schema.socialGroups.orgId, orgId),
        eq(schema.socialGroups.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Group not found');

    const [row] = await this.db
      .update(schema.socialGroups)
      .set({
        memberCount: sql`${schema.socialGroups.memberCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.socialGroups.id, groupId), eq(schema.socialGroups.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async leaveGroup(orgId: string, userId: string, groupId: string) {
    const existing = await this.db
      .select()
      .from(schema.socialGroups)
      .where(and(
        eq(schema.socialGroups.id, groupId),
        eq(schema.socialGroups.orgId, orgId),
        eq(schema.socialGroups.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Group not found');

    const [row] = await this.db
      .update(schema.socialGroups)
      .set({
        memberCount: sql`greatest(${schema.socialGroups.memberCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.socialGroups.id, groupId), eq(schema.socialGroups.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getShoutouts(orgId: string) {
    const shoutouts = await this.db
      .select({
        post: schema.socialPosts,
        authorName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.socialPosts)
      .leftJoin(schema.users, eq(schema.socialPosts.authorId, schema.users.id))
      .where(and(
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.isActive, true),
        eq(schema.socialPosts.type, 'shoutout'),
      ))
      .orderBy(desc(schema.socialPosts.createdAt))
      .limit(50);

    return {
      data: shoutouts.map((s) => ({
        ...s.post,
        authorName: s.authorName,
      })),
      meta: { total: shoutouts.length },
    };
  }
}
