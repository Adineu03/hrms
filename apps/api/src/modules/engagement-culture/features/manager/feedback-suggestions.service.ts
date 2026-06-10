import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, like, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { buildUserNameMap } from '../../../../shared/database/user-names.util';
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
    const emptyStats = { total: 0, newCount: 0, respondedCount: 0, escalatedCount: 0, anonymousCount: 0 };
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0, stats: emptyStats } };
    }

    // Feedback-type surveys only — pulse results already live on the Team Engagement tab.
    const feedbackSurveys = await this.db
      .select({ id: schema.surveys.id })
      .from(schema.surveys)
      .where(and(
        eq(schema.surveys.orgId, orgId),
        eq(schema.surveys.isActive, true),
        eq(schema.surveys.type, 'feedback'),
      ));

    const surveyIds = feedbackSurveys.map((s) => s.id);

    if (!surveyIds.length) {
      return { data: [], meta: { total: 0, stats: emptyStats } };
    }

    const responses = await this.db
      .select({
        response: schema.surveyResponses,
        surveyTitle: schema.surveys.title,
        surveyIsAnonymous: schema.surveys.isAnonymous,
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

    const nameMap = await buildUserNameMap(this.db, responses.map((r) => r.response.respondentId));

    // Shape rows for the tab. `answers` is a mixed log: question answers
    // ({ questionId, value }), an optional { type: 'meta', category, anonymous } entry,
    // and the entries appended by respondToFeedback / escalateFeedback — which is
    // exactly what drives the derived `status`.
    const items = responses.map((r) => {
      const answers: any[] = Array.isArray(r.response.answers) ? (r.response.answers as any[]) : [];
      const meta = answers.find((a) => a?.type === 'meta');
      const managerResponse = answers.find((a) => a?.type === 'manager_response');
      const escalation = answers.find((a) => a?.type === 'escalation');
      const status = escalation ? 'escalated' : managerResponse ? 'responded' : 'new';
      const message = answers
        .filter((a) => a?.questionId && typeof a.value === 'string' && a.value.trim())
        .map((a) => a.value.trim())
        .join(' ');
      const isAnonymous = Boolean(r.surveyIsAnonymous) || meta?.anonymous === true;
      return {
        id: r.response.id,
        employeeName: isAnonymous ? null : (nameMap.get(r.response.respondentId ?? '') ?? 'Unknown'),
        category: typeof meta?.category === 'string' && meta.category ? meta.category : 'general',
        message: message || '—',
        isAnonymous,
        status,
        managerResponse: typeof managerResponse?.response === 'string' ? managerResponse.response : null,
        escalationReason: typeof escalation?.reason === 'string' ? escalation.reason : null,
        surveyTitle: r.surveyTitle,
        createdAt: r.response.submittedAt ?? r.response.createdAt,
      };
    });

    // Cards are computed from the very rows the table renders, so they always agree.
    const stats = {
      total: items.length,
      newCount: items.filter((i) => i.status === 'new').length,
      respondedCount: items.filter((i) => i.status === 'responded').length,
      escalatedCount: items.filter((i) => i.status === 'escalated').length,
      anonymousCount: items.filter((i) => i.isAnonymous).length,
    };

    return { data: items, meta: { total: items.length, stats } };
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
    const emptyStats = { total: 0, newCount: 0, underReviewCount: 0, plannedCount: 0, implementedCount: 0, totalVotes: 0 };
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0, stats: emptyStats } };
    }

    // Suggestions are social posts following the employee submit-suggestion convention
    // ("[Suggestion: <title>] <description>", see survey-participation.service.ts),
    // optionally extended with "[Status: <status>]". Votes = post likes.
    const posts = await this.db
      .select()
      .from(schema.socialPosts)
      .where(and(
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.isActive, true),
        inArray(schema.socialPosts.authorId, teamMemberIds),
        eq(schema.socialPosts.type, 'announcement'),
        like(schema.socialPosts.content, '[Suggestion:%'),
      ))
      .orderBy(desc(schema.socialPosts.createdAt));

    const nameMap = await buildUserNameMap(this.db, posts.map((p) => p.authorId));

    const items = posts.map((p) => {
      const match = /^\[Suggestion:\s*([^\]]+)\]\s*(?:\[Status:\s*([^\]]+)\]\s*)?([\s\S]*)$/i.exec(p.content ?? '');
      const title = match?.[1]?.trim() || 'Suggestion';
      const status = match?.[2]?.trim().toLowerCase().replace(/[\s-]+/g, '_') || 'new';
      const description = match?.[3]?.trim() || '';
      return {
        id: p.id,
        title,
        description,
        submittedBy: nameMap.get(p.authorId) ?? 'Unknown',
        isAnonymous: false,
        status,
        votes: Number(p.likesCount) || 0,
        createdAt: p.createdAt,
      };
    });

    const stats = {
      total: items.length,
      newCount: items.filter((i) => i.status === 'new').length,
      underReviewCount: items.filter((i) => i.status === 'under_review').length,
      plannedCount: items.filter((i) => i.status === 'planned').length,
      implementedCount: items.filter((i) => i.status === 'implemented').length,
      totalVotes: items.reduce((s, i) => s + i.votes, 0),
    };

    return { data: items, meta: { total: items.length, stats } };
  }
}
