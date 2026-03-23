import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SurveyParticipationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listActiveSurveys(orgId: string, userId: string) {
    // Get all active surveys
    const activeSurveys = await this.db
      .select()
      .from(schema.surveys)
      .where(and(
        eq(schema.surveys.orgId, orgId),
        eq(schema.surveys.isActive, true),
        eq(schema.surveys.status, 'active'),
      ))
      .orderBy(desc(schema.surveys.createdAt));

    // Check which surveys the user has already responded to
    const myResponses = await this.db
      .select({ surveyId: schema.surveyResponses.surveyId })
      .from(schema.surveyResponses)
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.respondentId, userId),
        eq(schema.surveyResponses.isActive, true),
      ));

    const respondedSurveyIds = new Set(myResponses.map((r) => r.surveyId));

    const surveys = activeSurveys.map((s) => ({
      ...s,
      hasResponded: respondedSurveyIds.has(s.id),
    }));

    return { data: surveys, meta: { total: surveys.length } };
  }

  async getSurveyDetails(orgId: string, surveyId: string) {
    const surveys = await this.db
      .select()
      .from(schema.surveys)
      .where(and(
        eq(schema.surveys.id, surveyId),
        eq(schema.surveys.orgId, orgId),
        eq(schema.surveys.isActive, true),
      ));

    if (!surveys.length) throw new NotFoundException('Survey not found');

    return { data: surveys[0] };
  }

  async getSurveyQuestions(orgId: string, surveyId: string) {
    const surveys = await this.db
      .select()
      .from(schema.surveys)
      .where(and(
        eq(schema.surveys.id, surveyId),
        eq(schema.surveys.orgId, orgId),
        eq(schema.surveys.isActive, true),
      ));

    if (!surveys.length) throw new NotFoundException('Survey not found');

    const questions = Array.isArray(surveys[0].questions) ? surveys[0].questions : [];
    return { data: questions };
  }

  async submitSurveyResponse(orgId: string, userId: string, surveyId: string, dto: { answers: any[] }) {
    // Check survey exists and is active
    const surveys = await this.db
      .select()
      .from(schema.surveys)
      .where(and(
        eq(schema.surveys.id, surveyId),
        eq(schema.surveys.orgId, orgId),
        eq(schema.surveys.isActive, true),
        eq(schema.surveys.status, 'active'),
      ));

    if (!surveys.length) throw new NotFoundException('Survey not found or not active');

    // Check if already responded
    const existingResponse = await this.db
      .select()
      .from(schema.surveyResponses)
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.surveyId, surveyId),
        eq(schema.surveyResponses.respondentId, userId),
        eq(schema.surveyResponses.isActive, true),
      ));

    if (existingResponse.length) throw new BadRequestException('You have already responded to this survey');

    const [row] = await this.db
      .insert(schema.surveyResponses)
      .values({
        orgId,
        surveyId,
        respondentId: surveys[0].isAnonymous ? null : userId,
        answers: dto.answers,
      })
      .returning();

    // Increment response count
    await this.db
      .update(schema.surveys)
      .set({
        responseCount: (surveys[0].responseCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.surveys.id, surveyId));

    return { data: row };
  }

  async getMyResponses(orgId: string, userId: string) {
    const responses = await this.db
      .select({
        response: schema.surveyResponses,
        surveyTitle: schema.surveys.title,
        surveyType: schema.surveys.type,
      })
      .from(schema.surveyResponses)
      .leftJoin(schema.surveys, eq(schema.surveyResponses.surveyId, schema.surveys.id))
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.respondentId, userId),
        eq(schema.surveyResponses.isActive, true),
      ))
      .orderBy(desc(schema.surveyResponses.submittedAt));

    return {
      data: responses.map((r) => ({
        ...r.response,
        surveyTitle: r.surveyTitle,
        surveyType: r.surveyType,
      })),
      meta: { total: responses.length },
    };
  }

  async submitAnonymousFeedback(orgId: string, userId: string, dto: { content: string; category?: string }) {
    // Create a feedback survey response without linking to a specific survey
    // We use a convention: create a "feedback" type social post that is anonymous
    const [row] = await this.db
      .insert(schema.socialPosts)
      .values({
        orgId,
        authorId: userId,
        type: 'announcement',
        content: `[Anonymous Feedback${dto.category ? ` - ${dto.category}` : ''}] ${dto.content}`,
      })
      .returning();

    return { data: row };
  }

  async submitSuggestion(orgId: string, userId: string, dto: { title: string; content: string }) {
    const [row] = await this.db
      .insert(schema.socialPosts)
      .values({
        orgId,
        authorId: userId,
        type: 'announcement',
        content: `[Suggestion: ${dto.title}] ${dto.content}`,
      })
      .returning();

    return { data: row };
  }
}
