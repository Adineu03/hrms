import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class FeedbackSuggestionsService {
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

  async getTeamFeedback(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get feedback survey responses from team members
    const feedbackSurveys = await this.db
      .select()
      .from(schema.surveys)
      .where(and(
        eq(schema.surveys.orgId, orgId),
        eq(schema.surveys.isActive, true),
        sql`${schema.surveys.type} IN ('feedback', 'pulse')`,
      ));

    const surveyIds = feedbackSurveys.map((s) => s.id);

    if (!surveyIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    const responses = await this.db
      .select({
        response: schema.surveyResponses,
        surveyTitle: schema.surveys.title,
        surveyType: schema.surveys.type,
        isAnonymous: schema.surveys.isAnonymous,
      })
      .from(schema.surveyResponses)
      .leftJoin(schema.surveys, eq(schema.surveyResponses.surveyId, schema.surveys.id))
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.isActive, true),
        sql`${schema.surveyResponses.surveyId} = ANY(${surveyIds})`,
        sql`${schema.surveyResponses.respondentId} = ANY(${teamMemberIds})`,
      ))
      .orderBy(desc(schema.surveyResponses.submittedAt));

    return {
      data: responses.map((r) => ({
        ...r.response,
        surveyTitle: r.surveyTitle,
        surveyType: r.surveyType,
        isAnonymous: r.isAnonymous,
        respondentId: r.isAnonymous ? null : r.response.respondentId,
      })),
      meta: { total: responses.length },
    };
  }

  async respondToFeedback(orgId: string, managerId: string, responseId: string, responseText: string) {
    const existing = await this.db
      .select()
      .from(schema.surveyResponses)
      .where(and(
        eq(schema.surveyResponses.id, responseId),
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Feedback not found');

    const currentAnswers = (existing[0].answers as any[]) ?? [];
    const updatedAnswers = [
      ...currentAnswers,
      {
        type: 'manager_response',
        respondedBy: managerId,
        response: responseText,
        respondedAt: new Date().toISOString(),
      },
    ];

    const [row] = await this.db
      .update(schema.surveyResponses)
      .set({
        answers: updatedAnswers,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.surveyResponses.id, responseId), eq(schema.surveyResponses.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async escalateFeedback(orgId: string, managerId: string, responseId: string, reason?: string) {
    const existing = await this.db
      .select()
      .from(schema.surveyResponses)
      .where(and(
        eq(schema.surveyResponses.id, responseId),
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Feedback not found');

    const currentAnswers = (existing[0].answers as any[]) ?? [];
    const updatedAnswers = [
      ...currentAnswers,
      {
        type: 'escalation',
        escalatedBy: managerId,
        reason: reason ?? 'Critical issue requiring attention',
        escalatedAt: new Date().toISOString(),
      },
    ];

    const [row] = await this.db
      .update(schema.surveyResponses)
      .set({
        answers: updatedAnswers,
        sentiment: 'negative',
        updatedAt: new Date(),
      })
      .where(and(eq(schema.surveyResponses.id, responseId), eq(schema.surveyResponses.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getSuggestionTracking(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get posts that are suggestions/shoutouts from team members
    const suggestions = await this.db
      .select({
        post: schema.socialPosts,
        authorName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.socialPosts)
      .leftJoin(schema.users, eq(schema.socialPosts.authorId, schema.users.id))
      .where(and(
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.isActive, true),
        sql`${schema.socialPosts.authorId} = ANY(${teamMemberIds})`,
        sql`${schema.socialPosts.type} IN ('shoutout', 'announcement')`,
      ))
      .orderBy(desc(schema.socialPosts.createdAt));

    return {
      data: suggestions.map((s) => ({
        ...s.post,
        authorName: s.authorName,
      })),
      meta: { total: suggestions.length },
    };
  }
}
