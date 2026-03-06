import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamEngagementDashboardService {
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

  async getTeamEngagementScores(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { teamSize: 0, averageScore: 0, members: [] } };
    }

    // Get latest engagement scores for each team member
    const teamScores = await Promise.all(
      teamMemberIds.map(async (memberId) => {
        const scores = await this.db
          .select({
            score: schema.engagementScores,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
          })
          .from(schema.engagementScores)
          .innerJoin(schema.users, eq(schema.engagementScores.employeeId, schema.users.id))
          .where(and(
            eq(schema.engagementScores.orgId, orgId),
            eq(schema.engagementScores.employeeId, memberId),
            eq(schema.engagementScores.isActive, true),
          ))
          .orderBy(desc(schema.engagementScores.createdAt))
          .limit(1);

        return scores[0] ?? null;
      }),
    );

    const validScores = teamScores.filter((s) => s !== null);
    const avgScore = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + s.score.overallScore, 0) / validScores.length)
      : 0;

    return {
      data: {
        teamSize: teamMemberIds.length,
        averageScore: avgScore,
        members: validScores.map((s) => ({
          employeeId: s.score.employeeId,
          name: `${s.firstName} ${s.lastName ?? ''}`.trim(),
          overallScore: s.score.overallScore,
          enpsScore: s.score.enpsScore,
          period: s.score.period,
        })),
      },
    };
  }

  async getLatestPulseResults(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get latest pulse surveys
    const pulseSurveys = await this.db
      .select()
      .from(schema.surveys)
      .where(and(
        eq(schema.surveys.orgId, orgId),
        eq(schema.surveys.type, 'pulse'),
        eq(schema.surveys.isActive, true),
      ))
      .orderBy(desc(schema.surveys.createdAt))
      .limit(5);

    // Get team responses for these surveys
    const results = await Promise.all(
      pulseSurveys.map(async (survey) => {
        const responses = await this.db
          .select()
          .from(schema.surveyResponses)
          .where(and(
            eq(schema.surveyResponses.orgId, orgId),
            eq(schema.surveyResponses.surveyId, survey.id),
            eq(schema.surveyResponses.isActive, true),
            sql`${schema.surveyResponses.respondentId} = ANY(${teamMemberIds})`,
          ));

        const sentimentCounts = responses.reduce((acc, r) => {
          const sentiment = r.sentiment ?? 'unknown';
          acc[sentiment] = (acc[sentiment] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          surveyId: survey.id,
          title: survey.title,
          closesAt: survey.closesAt,
          teamResponses: responses.length,
          teamSize: teamMemberIds.length,
          participationRate: Math.round((responses.length / teamMemberIds.length) * 100),
          sentimentCounts,
        };
      }),
    );

    return { data: results, meta: { total: results.length } };
  }

  async getTeamParticipationRates(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { surveyParticipation: 0, wellnessParticipation: 0, socialParticipation: 0, teamSize: 0 } };
    }

    // Survey participation
    const surveyParticipants = await this.db
      .select({ count: sql<number>`count(distinct ${schema.surveyResponses.respondentId})` })
      .from(schema.surveyResponses)
      .where(and(
        eq(schema.surveyResponses.orgId, orgId),
        eq(schema.surveyResponses.isActive, true),
        sql`${schema.surveyResponses.respondentId} = ANY(${teamMemberIds})`,
      ));

    // Wellness participation
    const wellnessParticipants = await this.db
      .select({ count: sql<number>`count(distinct ${schema.wellnessParticipations.employeeId})` })
      .from(schema.wellnessParticipations)
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.isActive, true),
        sql`${schema.wellnessParticipations.employeeId} = ANY(${teamMemberIds})`,
      ));

    // Social participation
    const socialParticipants = await this.db
      .select({ count: sql<number>`count(distinct ${schema.socialPosts.authorId})` })
      .from(schema.socialPosts)
      .where(and(
        eq(schema.socialPosts.orgId, orgId),
        eq(schema.socialPosts.isActive, true),
        sql`${schema.socialPosts.authorId} = ANY(${teamMemberIds})`,
      ));

    return {
      data: {
        teamSize: teamMemberIds.length,
        surveyParticipation: Number(surveyParticipants[0]?.count ?? 0),
        wellnessParticipation: Number(wellnessParticipants[0]?.count ?? 0),
        socialParticipation: Number(socialParticipants[0]?.count ?? 0),
      },
    };
  }

  async getActionItems(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [] };
    }

    // Identify issues: low engagement scores
    const lowScores = await this.db
      .select({
        employeeId: schema.engagementScores.employeeId,
        overallScore: schema.engagementScores.overallScore,
        period: schema.engagementScores.period,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.engagementScores)
      .innerJoin(schema.users, eq(schema.engagementScores.employeeId, schema.users.id))
      .where(and(
        eq(schema.engagementScores.orgId, orgId),
        eq(schema.engagementScores.isActive, true),
        sql`${schema.engagementScores.employeeId} = ANY(${teamMemberIds})`,
        sql`${schema.engagementScores.overallScore} < 50`,
      ))
      .orderBy(schema.engagementScores.overallScore);

    const actionItems = lowScores.map((ls) => ({
      type: 'low_engagement',
      employeeId: ls.employeeId,
      employeeName: `${ls.firstName} ${ls.lastName ?? ''}`.trim(),
      score: ls.overallScore,
      period: ls.period,
      recommendation: ls.overallScore < 30
        ? 'Schedule a 1:1 meeting to discuss concerns and workload'
        : 'Consider providing growth opportunities and recognition',
    }));

    return { data: actionItems };
  }
}
