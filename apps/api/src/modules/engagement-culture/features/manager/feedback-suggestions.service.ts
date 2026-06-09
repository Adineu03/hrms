import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { AiCoreService } from '../../../../shared/ai/ai-core.service';

@Injectable()
export class FeedbackSuggestionsService {
  private readonly logger = new Logger(FeedbackSuggestionsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly ai: AiCoreService,
  ) {}

  /**
   * AI Feedback Digest — condense a batch of team feedback/suggestion texts into
   * a short executive digest (key themes + sentiment + suggested actions).
   * Summary only — never fabricates feedback not present in the input.
   */
  async generateDigest(items: string[]): Promise<{ ok: true; digest: string } | { ok: false; message: string }> {
    if (!this.ai.isReady()) return { ok: false, message: 'AI digest is not configured on this server.' };
    const cleaned = (items || []).map((s) => (s || '').trim()).filter(Boolean);
    if (cleaned.length === 0) return { ok: false, message: 'There is no feedback to summarize yet.' };

    const instructions = `You write a concise executive digest of employee feedback for a manager.
From the list of feedback items, produce: a one-line overall summary, 3–5 key themes (as a short bulleted list with "- "), the general sentiment, and 1–3 suggested actions.
Base everything strictly on the provided items — do NOT invent feedback, names, or numbers. Keep it under ~150 words.`;

    try {
      const digest = await this.ai.generateText({
        name: 'FeedbackDigest',
        instructions,
        text: JSON.stringify({ feedbackItems: cleaned.slice(0, 100) }),
      });
      return { ok: true, digest: digest.trim() };
    } catch (err: any) {
      this.logger.error('Feedback digest failed', err?.message || err);
      return { ok: false, message: 'Could not generate a digest. Please try again.' };
    }
  }

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
        inArray(schema.surveys.type, ['feedback', 'pulse']),
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
        inArray(schema.surveyResponses.surveyId, surveyIds),
        inArray(schema.surveyResponses.respondentId, teamMemberIds),
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
        inArray(schema.socialPosts.authorId, teamMemberIds),
        inArray(schema.socialPosts.type, ['shoutout', 'announcement']),
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
