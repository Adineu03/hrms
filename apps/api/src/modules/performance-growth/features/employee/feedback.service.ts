import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class FeedbackService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyFeedback(orgId: string, userId: string) {
    // content = '' rows are unfulfilled feedback requests, not received feedback.
    const rows = await this.db.select({ feedback: schema.feedbackRecords, from: schema.users })
      .from(schema.feedbackRecords).innerJoin(schema.users, eq(schema.feedbackRecords.fromUserId, schema.users.id))
      .where(and(eq(schema.feedbackRecords.orgId, orgId), eq(schema.feedbackRecords.toUserId, userId), eq(schema.feedbackRecords.isActive, true), ne(schema.feedbackRecords.content, '')))
      .orderBy(desc(schema.feedbackRecords.createdAt));
    return { data: rows.map(r => ({ ...r.feedback, fromName: r.feedback.isAnonymous ? 'Anonymous' : `${r.from.firstName} ${r.from.lastName ?? ''}`.trim(), canRespond: !r.feedback.responseContent })) };
  }

  async getFeedbackGiven(orgId: string, userId: string) {
    const rows = await this.db.select({ feedback: schema.feedbackRecords, to: schema.users })
      .from(schema.feedbackRecords).innerJoin(schema.users, eq(schema.feedbackRecords.toUserId, schema.users.id))
      .where(and(eq(schema.feedbackRecords.orgId, orgId), eq(schema.feedbackRecords.fromUserId, userId), eq(schema.feedbackRecords.isActive, true), ne(schema.feedbackRecords.content, '')))
      .orderBy(desc(schema.feedbackRecords.createdAt));
    return { data: rows.map(r => ({ ...r.feedback, toName: `${r.to.firstName} ${r.to.lastName ?? ''}`.trim() })) };
  }

  /** Colleagues the employee can pick when giving/requesting feedback (all active org users except self). */
  async getColleagues(orgId: string, userId: string) {
    const rows = await this.db.select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName, role: schema.users.role })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true), ne(schema.users.id, userId)))
      .orderBy(schema.users.firstName);
    return { data: rows };
  }

  async giveFeedback(orgId: string, userId: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.feedbackRecords).values({
      orgId, fromUserId: userId, toUserId: data.toUserId, type: data.type ?? 'general',
      category: data.category ?? null, content: data.content, isAnonymous: data.isAnonymous ?? false,
      visibility: data.visibility ?? 'private',
    }).returning();
    return created;
  }

  async requestFeedback(orgId: string, userId: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.feedbackRecords).values({
      orgId, fromUserId: data.fromUserId, toUserId: userId, type: 'general',
      content: '', requestedByUserId: userId, requestId: crypto.randomUUID(),
      visibility: 'private',
    }).returning();
    return { success: true, requestId: created.id };
  }

  async getPendingFeedbackRequests(orgId: string, userId: string) {
    const rows = await this.db.select({ feedback: schema.feedbackRecords, requester: schema.users })
      .from(schema.feedbackRecords).innerJoin(schema.users, eq(schema.feedbackRecords.requestedByUserId, schema.users.id))
      .where(and(eq(schema.feedbackRecords.orgId, orgId), eq(schema.feedbackRecords.fromUserId, userId), eq(schema.feedbackRecords.content, ''), eq(schema.feedbackRecords.isActive, true)))
      .orderBy(desc(schema.feedbackRecords.createdAt));
    return {
      data: rows.map(r => {
        const metadata = (r.feedback.metadata ?? {}) as Record<string, any>;
        const requesterName = `${r.requester.firstName} ${r.requester.lastName ?? ''}`.trim();
        return {
          ...r.feedback, requesterName,
          fromName: requesterName, // tab shows "Feedback for {fromName}"
          status: 'pending',
          cycleName: metadata.cycleName ?? 'General feedback',
          dueDate: metadata.dueDate ?? null,
        };
      }),
    };
  }

  async respondToFeedback(orgId: string, userId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db.select().from(schema.feedbackRecords)
      .where(and(eq(schema.feedbackRecords.id, id), eq(schema.feedbackRecords.orgId, orgId))).limit(1);
    if (!existing) throw new NotFoundException('Feedback not found');
    const text = data.content ?? data.response ?? '';
    const updates: Record<string, any> = { respondedAt: new Date(), updatedAt: new Date() };
    if (!existing.content) {
      // Fulfilling an open feedback request: the text becomes the feedback itself.
      updates.content = text;
    } else {
      updates.responseContent = text;
    }
    await this.db.update(schema.feedbackRecords).set(updates)
      .where(and(eq(schema.feedbackRecords.id, id), eq(schema.feedbackRecords.orgId, orgId)));
    return { success: true };
  }

  async getFeedbackWall(orgId: string) {
    const toUsers = alias(schema.users, 'to_users');
    const rows = await this.db.select({ feedback: schema.feedbackRecords, from: schema.users, to: toUsers })
      .from(schema.feedbackRecords)
      .innerJoin(schema.users, eq(schema.feedbackRecords.fromUserId, schema.users.id))
      .innerJoin(toUsers, eq(schema.feedbackRecords.toUserId, toUsers.id))
      .where(and(eq(schema.feedbackRecords.orgId, orgId), eq(schema.feedbackRecords.visibility, 'public'), eq(schema.feedbackRecords.isActive, true), ne(schema.feedbackRecords.content, '')))
      .orderBy(desc(schema.feedbackRecords.createdAt)).limit(50);
    return {
      data: rows.map(r => ({
        ...r.feedback,
        message: r.feedback.content,
        fromName: r.feedback.isAnonymous ? 'Anonymous' : `${r.from.firstName} ${r.from.lastName ?? ''}`.trim(),
        toName: `${r.to.firstName} ${r.to.lastName ?? ''}`.trim(),
      })),
    };
  }
}
