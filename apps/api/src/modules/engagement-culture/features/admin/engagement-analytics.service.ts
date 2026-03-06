import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class EngagementAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getEnpsTracking(orgId: string) {
    const scores = await this.db
      .select({
        period: schema.engagementScores.period,
        avgEnps: sql<number>`avg(${schema.engagementScores.enpsScore})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.engagementScores)
      .where(and(eq(schema.engagementScores.orgId, orgId), eq(schema.engagementScores.isActive, true)))
      .groupBy(schema.engagementScores.period)
      .orderBy(schema.engagementScores.period);

    return {
      data: scores.map((s) => ({
        period: s.period,
        enps: Math.round(Number(s.avgEnps ?? 0)),
        respondents: Number(s.count),
      })),
      meta: { total: scores.length },
    };
  }

  async getEngagementScoreTrends(orgId: string) {
    const trends = await this.db
      .select({
        period: schema.engagementScores.period,
        avgScore: sql<number>`avg(${schema.engagementScores.overallScore})`,
        avgCultureFit: sql<number>`avg(${schema.engagementScores.cultureFitScore})`,
        avgParticipation: sql<number>`avg(${schema.engagementScores.participationScore})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.engagementScores)
      .where(and(eq(schema.engagementScores.orgId, orgId), eq(schema.engagementScores.isActive, true)))
      .groupBy(schema.engagementScores.period)
      .orderBy(schema.engagementScores.period);

    return {
      data: trends.map((t) => ({
        period: t.period,
        overallScore: Math.round(Number(t.avgScore ?? 0)),
        cultureFitScore: Math.round(Number(t.avgCultureFit ?? 0)),
        participationScore: Math.round(Number(t.avgParticipation ?? 0)),
        respondents: Number(t.count),
      })),
      meta: { total: trends.length },
    };
  }

  async getDepartmentComparison(orgId: string) {
    const departmentScores = await this.db
      .select({
        departmentId: schema.employeeProfiles.departmentId,
        avgScore: sql<number>`avg(${schema.engagementScores.overallScore})`,
        avgEnps: sql<number>`avg(${schema.engagementScores.enpsScore})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.engagementScores)
      .innerJoin(schema.employeeProfiles, and(
        eq(schema.engagementScores.employeeId, schema.employeeProfiles.userId),
        eq(schema.employeeProfiles.orgId, orgId),
      ))
      .where(and(eq(schema.engagementScores.orgId, orgId), eq(schema.engagementScores.isActive, true)))
      .groupBy(schema.employeeProfiles.departmentId);

    // Get department names
    const departments = await this.db
      .select({ id: schema.departments.id, name: schema.departments.name })
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));

    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

    return {
      data: departmentScores.map((ds) => ({
        departmentId: ds.departmentId,
        departmentName: departmentMap.get(ds.departmentId ?? '') ?? 'Unknown',
        averageScore: Math.round(Number(ds.avgScore ?? 0)),
        averageEnps: Math.round(Number(ds.avgEnps ?? 0)),
        employeeCount: Number(ds.count),
      })),
      meta: { total: departmentScores.length },
    };
  }

  async getAttritionRiskCorrelation(orgId: string) {
    // Get employees with low engagement scores
    const lowEngagement = await this.db
      .select({
        employeeId: schema.engagementScores.employeeId,
        overallScore: schema.engagementScores.overallScore,
        enpsScore: schema.engagementScores.enpsScore,
        period: schema.engagementScores.period,
      })
      .from(schema.engagementScores)
      .where(and(
        eq(schema.engagementScores.orgId, orgId),
        eq(schema.engagementScores.isActive, true),
        sql`${schema.engagementScores.overallScore} < 40`,
      ))
      .orderBy(desc(schema.engagementScores.createdAt))
      .limit(50);

    // Get employee details for low engagement employees
    const atRiskEmployees = await Promise.all(
      lowEngagement.map(async (le) => {
        const profiles = await this.db
          .select({
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
            departmentId: schema.employeeProfiles.departmentId,
            designationId: schema.employeeProfiles.designationId,
          })
          .from(schema.employeeProfiles)
          .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
          .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.userId, le.employeeId)));

        return {
          employeeId: le.employeeId,
          name: profiles[0] ? `${profiles[0].firstName} ${profiles[0].lastName ?? ''}`.trim() : 'Unknown',
          departmentId: profiles[0]?.departmentId,
          designationId: profiles[0]?.designationId,
          engagementScore: le.overallScore,
          enpsScore: le.enpsScore,
          period: le.period,
          riskLevel: le.overallScore < 20 ? 'high' : le.overallScore < 30 ? 'medium' : 'low',
        };
      }),
    );

    return {
      data: atRiskEmployees,
      meta: { total: atRiskEmployees.length },
    };
  }

  async getActionItems(orgId: string) {
    const moduleConfig = await this.db
      .select()
      .from(schema.orgModules)
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'engagement-culture')));

    const config = (moduleConfig[0]?.config as Record<string, any>) ?? {};
    return { data: config.actionItems ?? [] };
  }

  async saveActionItems(orgId: string, actionItems: any[]) {
    const moduleConfig = await this.db
      .select()
      .from(schema.orgModules)
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'engagement-culture')));

    if (!moduleConfig.length) throw new NotFoundException('Module configuration not found');

    const existingConfig = (moduleConfig[0].config as Record<string, any>) ?? {};
    const [row] = await this.db
      .update(schema.orgModules)
      .set({
        config: { ...existingConfig, actionItems },
        updatedAt: new Date(),
      })
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'engagement-culture')))
      .returning();

    return { data: row };
  }
}
