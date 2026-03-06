import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SurveyPulseManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listSurveys(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.surveys)
      .where(and(eq(schema.surveys.orgId, orgId), eq(schema.surveys.isActive, true)))
      .orderBy(desc(schema.surveys.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createSurvey(orgId: string, dto: { title: string; type?: string; description?: string; questions?: any[]; targetAudience?: any; isAnonymous?: boolean; scheduledAt?: string; closesAt?: string }) {
    const [row] = await this.db
      .insert(schema.surveys)
      .values({
        orgId,
        title: dto.title,
        type: dto.type ?? 'engagement',
        description: dto.description ?? null,
        questions: dto.questions ?? [],
        targetAudience: dto.targetAudience ?? {},
        isAnonymous: dto.isAnonymous ?? true,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
      })
      .returning();

    return { data: row };
  }

  async updateSurvey(orgId: string, id: string, dto: { title?: string; type?: string; description?: string; questions?: any[]; targetAudience?: any; isAnonymous?: boolean; scheduledAt?: string; closesAt?: string }) {
    const existing = await this.db
      .select()
      .from(schema.surveys)
      .where(and(eq(schema.surveys.id, id), eq(schema.surveys.orgId, orgId), eq(schema.surveys.isActive, true)));

    if (!existing.length) throw new NotFoundException('Survey not found');

    const [row] = await this.db
      .update(schema.surveys)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.questions !== undefined && { questions: dto.questions }),
        ...(dto.targetAudience !== undefined && { targetAudience: dto.targetAudience }),
        ...(dto.isAnonymous !== undefined && { isAnonymous: dto.isAnonymous }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }),
        ...(dto.closesAt !== undefined && { closesAt: dto.closesAt ? new Date(dto.closesAt) : null }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.surveys.id, id), eq(schema.surveys.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteSurvey(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.surveys)
      .where(and(eq(schema.surveys.id, id), eq(schema.surveys.orgId, orgId), eq(schema.surveys.isActive, true)));

    if (!existing.length) throw new NotFoundException('Survey not found');

    const [row] = await this.db
      .update(schema.surveys)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.surveys.id, id), eq(schema.surveys.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async publishSurvey(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.surveys)
      .where(and(eq(schema.surveys.id, id), eq(schema.surveys.orgId, orgId), eq(schema.surveys.isActive, true)));

    if (!existing.length) throw new NotFoundException('Survey not found');

    const [row] = await this.db
      .update(schema.surveys)
      .set({ status: 'active', updatedAt: new Date() })
      .where(and(eq(schema.surveys.id, id), eq(schema.surveys.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async listResponses(orgId: string, surveyId: string) {
    const responses = await this.db
      .select({
        response: schema.surveyResponses,
        respondentName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.surveyResponses)
      .leftJoin(schema.users, eq(schema.surveyResponses.respondentId, schema.users.id))
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.surveyId, surveyId),
        eq(schema.surveyResponses.isActive, true),
      ))
      .orderBy(desc(schema.surveyResponses.submittedAt));

    return {
      data: responses.map((r) => ({
        ...r.response,
        respondentName: r.respondentName,
      })),
      meta: { total: responses.length },
    };
  }

  async getSurveyAnalytics(orgId: string) {
    // Total surveys
    const allSurveys = await this.db
      .select()
      .from(schema.surveys)
      .where(and(eq(schema.surveys.orgId, orgId), eq(schema.surveys.isActive, true)));

    // Total responses
    const totalResponses = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.surveyResponses)
      .where(and(eq(schema.surveyResponses.orgId, orgId), eq(schema.surveyResponses.isActive, true)));

    // Sentiment breakdown
    const sentimentBreakdown = await this.db
      .select({
        sentiment: schema.surveyResponses.sentiment,
        count: sql<number>`count(*)`,
      })
      .from(schema.surveyResponses)
      .where(and(eq(schema.surveyResponses.orgId, orgId), eq(schema.surveyResponses.isActive, true)))
      .groupBy(schema.surveyResponses.sentiment);

    return {
      data: {
        totalSurveys: allSurveys.length,
        activeSurveys: allSurveys.filter((s) => s.status === 'active').length,
        totalResponses: Number(totalResponses[0]?.count ?? 0),
        sentimentBreakdown: sentimentBreakdown.map((s) => ({
          sentiment: s.sentiment ?? 'unknown',
          count: Number(s.count),
        })),
        averageResponseRate: allSurveys.length > 0
          ? Math.round(allSurveys.reduce((sum, s) => sum + (s.responseCount ?? 0), 0) / allSurveys.length)
          : 0,
      },
    };
  }
}
