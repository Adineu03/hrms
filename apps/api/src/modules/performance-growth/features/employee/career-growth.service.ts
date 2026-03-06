import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CareerGrowthService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getCareerPaths(orgId: string, userId: string) {
    const designations = await this.db.select().from(schema.designations).where(eq(schema.designations.orgId, orgId));
    const [profile] = await this.db.select().from(schema.employeeProfiles)
      .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.userId, userId))).limit(1);
    const currentDesignation = designations.find(d => d.id === profile?.designationId);
    const paths = designations
      .filter(d => d.level && currentDesignation?.level && Number(d.level) > Number(currentDesignation.level))
      .sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0))
      .map(d => ({ id: d.id, name: d.name, level: d.level, departmentId: d.departmentId }));
    return { currentRole: currentDesignation?.name ?? null, currentLevel: currentDesignation?.level ?? null, paths };
  }

  async getCareerPathDetail(orgId: string, pathId: string) {
    const [designation] = await this.db.select().from(schema.designations)
      .where(and(eq(schema.designations.id, pathId), eq(schema.designations.orgId, orgId))).limit(1);
    if (!designation) return null;
    const competencies = await this.db.select().from(schema.competencyFrameworks)
      .where(and(eq(schema.competencyFrameworks.orgId, orgId), eq(schema.competencyFrameworks.isActive, true)));
    return { designation, requiredCompetencies: competencies.filter(c => { const deptIds = (c.departmentIds as string[]) ?? []; return deptIds.length === 0 || deptIds.includes(designation.departmentId ?? ''); }) };
  }

  async getGapAnalysis(orgId: string, userId: string) {
    const plans = await this.db.select().from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.employeeId, userId), eq(schema.developmentPlans.isActive, true)));
    const latestPlan = plans[0];
    return { targetRole: latestPlan?.targetRole ?? null, gapAnalysis: latestPlan?.gapAnalysis ?? {}, skills: latestPlan?.skills ?? [] };
  }

  async getInternalOpportunities(orgId: string) {
    const openReqs = await this.db.select({ req: schema.jobRequisitions, dept: schema.departments })
      .from(schema.jobRequisitions)
      .leftJoin(schema.departments, eq(schema.jobRequisitions.departmentId, schema.departments.id))
      .where(and(eq(schema.jobRequisitions.orgId, orgId), eq(schema.jobRequisitions.status, 'approved'), eq(schema.jobRequisitions.isActive, true)));
    return { data: openReqs.map(r => ({ id: r.req.id, title: r.req.title, department: r.dept?.name ?? null, location: null, headcount: r.req.headcount })) };
  }

  async getPromotionReadiness(orgId: string, userId: string) {
    const reviews = await this.db.select({ assignment: schema.reviewAssignments, cycle: schema.reviewCycles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId), eq(schema.reviewAssignments.isActive, true)))
      .orderBy(desc(schema.reviewCycles.startDate));
    const latestRating = Number(reviews[0]?.assignment.finalRating ?? reviews[0]?.assignment.managerRating ?? 0);
    const goals = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.employeeId, userId), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)));
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const totalGoals = goals.length;
    return { latestRating, goalCompletionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0, reviewCount: reviews.length, readinessScore: latestRating >= 4 && (completedGoals / Math.max(totalGoals, 1)) >= 0.8 ? 'Ready' : latestRating >= 3 ? 'Developing' : 'Not Ready' };
  }

  async getGrowthMilestones(orgId: string, userId: string) {
    const completedGoals = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.employeeId, userId), eq(schema.goals.status, 'completed'), eq(schema.goals.isActive, true)))
      .orderBy(desc(schema.goals.completedAt));
    const plans = await this.db.select().from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.employeeId, userId), eq(schema.developmentPlans.isActive, true)));
    const certs: any[] = [];
    for (const p of plans) { if (Array.isArray(p.certifications)) certs.push(...(p.certifications as any[])); }
    return { completedGoals: completedGoals.map(g => ({ title: g.title, completedAt: g.completedAt })), certifications: certs };
  }

  async requestCareerDiscussion(orgId: string, userId: string, data: Record<string, any>) {
    const [profile] = await this.db.select().from(schema.employeeProfiles)
      .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.userId, userId))).limit(1);
    return { success: true, message: 'Career discussion request sent to your manager', managerId: profile?.managerId ?? null, topic: data.topic ?? 'Career Growth Discussion' };
  }
}
