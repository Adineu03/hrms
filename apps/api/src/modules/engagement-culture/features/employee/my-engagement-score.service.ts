import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyEngagementScoreService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPersonalMetrics(orgId: string, userId: string) {
    // Get latest engagement score
    const latestScore = await this.db
      .select()
      .from(schema.engagementScores)
      .where(and(
        eq(schema.engagementScores.orgId, orgId),
        eq(schema.engagementScores.employeeId, userId),
        eq(schema.engagementScores.isActive, true),
      ))
      .orderBy(desc(schema.engagementScores.createdAt))
      .limit(1);

    // Get org average for comparison
    const orgAverage = await this.db
      .select({
        avgScore: sql<number>`avg(${schema.engagementScores.overallScore})`,
      })
      .from(schema.engagementScores)
      .where(and(eq(schema.engagementScores.orgId, orgId), eq(schema.engagementScores.isActive, true)));

    return {
      data: {
        current: latestScore[0] ? {
          overallScore: latestScore[0].overallScore,
          enpsScore: latestScore[0].enpsScore,
          cultureFitScore: latestScore[0].cultureFitScore,
          participationScore: latestScore[0].participationScore,
          period: latestScore[0].period,
          breakdown: latestScore[0].breakdown,
        } : null,
        orgAverage: Math.round(Number(orgAverage[0]?.avgScore ?? 0)),
      },
    };
  }

  async getScoreHistory(orgId: string, userId: string) {
    const history = await this.db
      .select()
      .from(schema.engagementScores)
      .where(and(
        eq(schema.engagementScores.orgId, orgId),
        eq(schema.engagementScores.employeeId, userId),
        eq(schema.engagementScores.isActive, true),
      ))
      .orderBy(desc(schema.engagementScores.createdAt));

    return {
      data: history.map((h) => ({
        id: h.id,
        overallScore: h.overallScore,
        enpsScore: h.enpsScore,
        cultureFitScore: h.cultureFitScore,
        participationScore: h.participationScore,
        period: h.period,
        createdAt: h.createdAt,
      })),
      meta: { total: history.length },
    };
  }

  async getBadges(orgId: string, userId: string) {
    // Collect badges from engagement scores
    const scores = await this.db
      .select({ badges: schema.engagementScores.badges })
      .from(schema.engagementScores)
      .where(and(
        eq(schema.engagementScores.orgId, orgId),
        eq(schema.engagementScores.employeeId, userId),
        eq(schema.engagementScores.isActive, true),
      ));

    const allBadges = scores.flatMap((s) => (s.badges as any[]) ?? []);

    // Deduplicate badges by name
    const uniqueBadges = Array.from(
      new Map(allBadges.map((b) => [b.name ?? b, b])).values(),
    );

    return { data: uniqueBadges, meta: { total: uniqueBadges.length } };
  }

  async getParticipationHistory(orgId: string, userId: string) {
    // Wellness participation (program name + points)
    const wellness = await this.db
      .select({
        id: schema.wellnessParticipations.id,
        points: schema.wellnessParticipations.pointsEarned,
        status: schema.wellnessParticipations.status,
        enrolledAt: schema.wellnessParticipations.enrolledAt,
        completedAt: schema.wellnessParticipations.completedAt,
        programName: schema.wellnessPrograms.name,
      })
      .from(schema.wellnessParticipations)
      .innerJoin(schema.wellnessPrograms, eq(schema.wellnessParticipations.programId, schema.wellnessPrograms.id))
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.employeeId, userId),
        eq(schema.wellnessParticipations.isActive, true),
      ));

    // Survey responses (survey title)
    const surveyRows = await this.db
      .select({
        id: schema.surveyResponses.id,
        submittedAt: schema.surveyResponses.submittedAt,
        title: schema.surveys.title,
      })
      .from(schema.surveyResponses)
      .innerJoin(schema.surveys, eq(schema.surveyResponses.surveyId, schema.surveys.id))
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.respondentId, userId),
        eq(schema.surveyResponses.isActive, true),
      ));

    // Social posts authored
    const posts = await this.db
      .select({
        id: schema.socialPosts.id,
        content: schema.socialPosts.content,
        type: schema.socialPosts.type,
        createdAt: schema.socialPosts.createdAt,
      })
      .from(schema.socialPosts)
      .where(and(
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.authorId, userId),
        eq(schema.socialPosts.isActive, true),
      ));

    const entries = [
      ...wellness.map((w) => ({
        id: `w-${w.id}`,
        activity: w.status === 'completed' ? `Completed "${w.programName}"` : `Enrolled in "${w.programName}"`,
        type: 'wellness',
        pointsEarned: Number(w.points) || 0,
        date: (w.completedAt ?? w.enrolledAt) as Date | null,
      })),
      ...surveyRows.map((s) => ({
        id: `s-${s.id}`,
        activity: `Responded to "${s.title}"`,
        type: 'survey',
        pointsEarned: 10,
        date: s.submittedAt as Date | null,
      })),
      ...posts.map((p) => ({
        id: `p-${p.id}`,
        activity: (p.content ?? '').length > 50 ? `${(p.content ?? '').slice(0, 50)}…` : (p.content ?? 'Shared a post'),
        type: p.type === 'shoutout' ? 'recognition' : 'social',
        pointsEarned: 5,
        date: p.createdAt as Date | null,
      })),
    ].sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0));

    return { data: entries };
  }
}
