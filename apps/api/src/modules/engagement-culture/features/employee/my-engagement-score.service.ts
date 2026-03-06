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
    // Survey participation
    const surveyCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.surveyResponses)
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.respondentId, userId),
        eq(schema.surveyResponses.isActive, true),
      ));

    // Wellness participation
    const wellnessParticipation = await this.db
      .select({
        count: sql<number>`count(*)`,
        completed: sql<number>`count(case when ${schema.wellnessParticipations.status} = 'completed' then 1 end)`,
        totalPoints: sql<number>`coalesce(sum(${schema.wellnessParticipations.pointsEarned}), 0)`,
      })
      .from(schema.wellnessParticipations)
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.employeeId, userId),
        eq(schema.wellnessParticipations.isActive, true),
      ));

    // Social participation
    const socialActivity = await this.db
      .select({
        postCount: sql<number>`count(*)`,
        totalLikes: sql<number>`coalesce(sum(${schema.socialPosts.likesCount}), 0)`,
      })
      .from(schema.socialPosts)
      .where(and(
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.authorId, userId),
        eq(schema.socialPosts.isActive, true),
      ));

    return {
      data: {
        surveys: {
          totalResponded: Number(surveyCount[0]?.count ?? 0),
        },
        wellness: {
          totalEnrolled: Number(wellnessParticipation[0]?.count ?? 0),
          completed: Number(wellnessParticipation[0]?.completed ?? 0),
          pointsEarned: Number(wellnessParticipation[0]?.totalPoints ?? 0),
        },
        social: {
          postsCreated: Number(socialActivity[0]?.postCount ?? 0),
          likesReceived: Number(socialActivity[0]?.totalLikes ?? 0),
        },
      },
    };
  }
}
