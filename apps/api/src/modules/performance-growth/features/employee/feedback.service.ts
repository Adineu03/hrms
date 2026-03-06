import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class FeedbackService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyFeedback(orgId: string, userId: string) {
    const rows = await this.db.select({ feedback: schema.feedbackRecords, from: schema.users })
      .from(schema.feedbackRecords).innerJoin(schema.users, eq(schema.feedbackRecords.fromUserId, schema.users.id))
      .where(and(eq(schema.feedbackRecords.orgId, orgId), eq(schema.feedbackRecords.toUserId, userId), eq(schema.feedbackRecords.isActive, true)))
      .orderBy(desc(schema.feedbackRecords.createdAt));
    return { data: rows.map(r => ({ ...r.feedback, fromName: r.feedback.isAnonymous ? 'Anonymous' : `${r.from.firstName} ${r.from.lastName}` })) };
  }

  async getFeedbackGiven(orgId: string, userId: string) {
    const rows = await this.db.select({ feedback: schema.feedbackRecords, to: schema.users })
      .from(schema.feedbackRecords).innerJoin(schema.users, eq(schema.feedbackRecords.toUserId, schema.users.id))
      .where(and(eq(schema.feedbackRecords.orgId, orgId), eq(schema.feedbackRecords.fromUserId, userId), eq(schema.feedbackRecords.isActive, true)))
      .orderBy(desc(schema.feedbackRecords.createdAt));
    return { data: rows.map(r => ({ ...r.feedback, toName: `${r.to.firstName} ${r.to.lastName}` })) };
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
    return { data: rows.map(r => ({ ...r.feedback, requesterName: `${r.requester.firstName} ${r.requester.lastName}` })) };
  }

  async respondToFeedback(orgId: string, userId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db.select().from(schema.feedbackRecords)
      .where(and(eq(schema.feedbackRecords.id, id), eq(schema.feedbackRecords.orgId, orgId))).limit(1);
    if (!existing) throw new NotFoundException('Feedback not found');
    await this.db.update(schema.feedbackRecords).set({ responseContent: data.response, respondedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.feedbackRecords.id, id), eq(schema.feedbackRecords.orgId, orgId)));
    return { success: true };
  }

  async getFeedbackWall(orgId: string) {
    const rows = await this.db.select({ feedback: schema.feedbackRecords, from: schema.users, to: schema.users })
      .from(schema.feedbackRecords)
      .innerJoin(schema.users, eq(schema.feedbackRecords.fromUserId, schema.users.id))
      .where(and(eq(schema.feedbackRecords.orgId, orgId), eq(schema.feedbackRecords.visibility, 'public'), eq(schema.feedbackRecords.isActive, true)))
      .orderBy(desc(schema.feedbackRecords.createdAt)).limit(50);
    return { data: rows.map(r => ({ ...r.feedback, fromName: r.feedback.isAnonymous ? 'Anonymous' : `${r.from.firstName} ${r.from.lastName}` })) };
  }
}
