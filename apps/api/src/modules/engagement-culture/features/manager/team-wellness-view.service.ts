import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamWellnessViewService {
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

  async getTeamWellnessOverview(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { teamSize: 0, participations: [], enrollmentRate: 0 } };
    }

    // Get wellness participations for team members
    const participations = await this.db
      .select({
        participation: schema.wellnessParticipations,
        programName: schema.wellnessPrograms.name,
        programType: schema.wellnessPrograms.type,
        employeeName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.wellnessParticipations)
      .leftJoin(schema.wellnessPrograms, eq(schema.wellnessParticipations.programId, schema.wellnessPrograms.id))
      .leftJoin(schema.users, eq(schema.wellnessParticipations.employeeId, schema.users.id))
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.isActive, true),
        sql`${schema.wellnessParticipations.employeeId} = ANY(${teamMemberIds})`,
      ))
      .orderBy(desc(schema.wellnessParticipations.enrolledAt));

    const uniqueParticipants = new Set(participations.map((p) => p.participation.employeeId));

    return {
      data: {
        teamSize: teamMemberIds.length,
        enrolledMembers: uniqueParticipants.size,
        enrollmentRate: Math.round((uniqueParticipants.size / teamMemberIds.length) * 100),
        participations: participations.map((p) => ({
          ...p.participation,
          programName: p.programName,
          programType: p.programType,
          employeeName: p.employeeName,
        })),
      },
    };
  }

  async getStressIndicators(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { teamSize: 0, indicators: [] } };
    }

    // Use engagement scores + survey sentiment as stress proxy
    const indicators = await Promise.all(
      teamMemberIds.map(async (memberId) => {
        const latestScore = await this.db
          .select()
          .from(schema.engagementScores)
          .where(and(
            eq(schema.engagementScores.orgId, orgId),
            eq(schema.engagementScores.employeeId, memberId),
            eq(schema.engagementScores.isActive, true),
          ))
          .orderBy(desc(schema.engagementScores.createdAt))
          .limit(1);

        const recentSurveyResponses = await this.db
          .select({ sentiment: schema.surveyResponses.sentiment })
          .from(schema.surveyResponses)
          .where(and(
            eq(schema.surveyResponses.orgId, orgId),
            eq(schema.surveyResponses.respondentId, memberId),
            eq(schema.surveyResponses.isActive, true),
          ))
          .orderBy(desc(schema.surveyResponses.submittedAt))
          .limit(3);

        const negativeSentiments = recentSurveyResponses.filter((r) => r.sentiment === 'negative').length;
        const engagementScore = latestScore[0]?.overallScore ?? 50;

        const profile = await this.db
          .select({
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
          })
          .from(schema.users)
          .where(eq(schema.users.id, memberId));

        let stressLevel: 'low' | 'moderate' | 'high' = 'low';
        if (engagementScore < 30 || negativeSentiments >= 2) stressLevel = 'high';
        else if (engagementScore < 50 || negativeSentiments >= 1) stressLevel = 'moderate';

        return {
          employeeId: memberId,
          name: profile[0] ? `${profile[0].firstName} ${profile[0].lastName ?? ''}`.trim() : 'Unknown',
          engagementScore,
          negativeSentimentCount: negativeSentiments,
          stressLevel,
        };
      }),
    );

    return {
      data: {
        teamSize: teamMemberIds.length,
        highStressCount: indicators.filter((i) => i.stressLevel === 'high').length,
        moderateStressCount: indicators.filter((i) => i.stressLevel === 'moderate').length,
        indicators: indicators.sort((a, b) => {
          const order = { high: 0, moderate: 1, low: 2 };
          return order[a.stressLevel] - order[b.stressLevel];
        }),
      },
    };
  }

  async getTeamWellnessRecommendations(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: [] };
    }

    // Get available wellness programs
    const availablePrograms = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(
        eq(schema.wellnessPrograms.orgId, orgId),
        eq(schema.wellnessPrograms.isActive, true),
        eq(schema.wellnessPrograms.status, 'active'),
      ));

    // Get team's current participations
    const currentParticipations = await this.db
      .select({ programId: schema.wellnessParticipations.programId })
      .from(schema.wellnessParticipations)
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.isActive, true),
        sql`${schema.wellnessParticipations.employeeId} = ANY(${teamMemberIds})`,
      ));

    const enrolledProgramIds = new Set(currentParticipations.map((p) => p.programId));

    const recommendations = availablePrograms
      .filter((p) => !enrolledProgramIds.has(p.id))
      .map((p) => ({
        programId: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        reason: `This ${p.type} program could benefit team members who haven't yet enrolled`,
      }));

    return { data: recommendations };
  }
}
