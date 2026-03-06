import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TalentAssessmentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return members.map((m) => m.userId);
  }

  async getNineBoxGrid(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: { grid: [], unassessed: [] } };

    // Get latest review assignments for team
    const reviews = await this.db
      .select({
        employeeId: schema.reviewAssignments.employeeId,
        finalRating: schema.reviewAssignments.finalRating,
        calibratedRating: schema.reviewAssignments.calibratedRating,
        metadata: schema.reviewAssignments.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.reviewAssignments.orgId, orgId),
          inArray(schema.reviewAssignments.employeeId, teamIds),
          eq(schema.reviewAssignments.isActive, true),
        ),
      )
      .orderBy(desc(schema.reviewAssignments.createdAt));

    // Deduplicate: latest per employee
    const latestMap = new Map<string, typeof reviews[0]>();
    for (const r of reviews) {
      if (!latestMap.has(r.employeeId)) {
        latestMap.set(r.employeeId, r);
      }
    }

    const grid: Array<{
      employeeId: string;
      name: string;
      performance: number;
      potential: number;
      box: string;
    }> = [];

    const unassessed: Array<{ employeeId: string; name: string }> = [];

    for (const empId of teamIds) {
      const review = latestMap.get(empId);
      if (!review) {
        // Get name for unassessed
        const [user] = await this.db
          .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
          .from(schema.users)
          .where(eq(schema.users.id, empId));
        if (user) unassessed.push({ employeeId: empId, name: `${user.firstName} ${user.lastName ?? ''}`.trim() });
        continue;
      }

      const performance = Number(review.calibratedRating ?? review.finalRating ?? 0);
      const meta = (review.metadata as Record<string, any>) ?? {};
      const potential = Number(meta.potentialRating ?? meta.potential ?? performance);
      const name = `${review.firstName} ${review.lastName ?? ''}`.trim();

      // Determine 9-box position
      const perfLevel = performance >= 4 ? 'high' : performance >= 2.5 ? 'medium' : 'low';
      const potLevel = potential >= 4 ? 'high' : potential >= 2.5 ? 'medium' : 'low';

      const boxLabels: Record<string, Record<string, string>> = {
        high: { high: 'Star', medium: 'High Performer', low: 'Solid Performer' },
        medium: { high: 'High Potential', medium: 'Core Player', low: 'Average Performer' },
        low: { high: 'Inconsistent Player', medium: 'Development Needed', low: 'Risk' },
      };

      grid.push({
        employeeId: empId,
        name,
        performance,
        potential,
        box: boxLabels[perfLevel][potLevel],
      });
    }

    return { data: { grid, unassessed } };
  }

  async updateNineBoxAssessment(orgId: string, managerId: string, body: {
    assessments: Array<{
      employeeId: string;
      potentialRating: number;
      notes?: string;
    }>;
  }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    const updated: string[] = [];

    for (const assessment of body.assessments) {
      if (!teamIds.includes(assessment.employeeId)) continue;

      // Get latest review assignment for this employee
      const [review] = await this.db
        .select({ id: schema.reviewAssignments.id, metadata: schema.reviewAssignments.metadata })
        .from(schema.reviewAssignments)
        .where(
          and(
            eq(schema.reviewAssignments.orgId, orgId),
            eq(schema.reviewAssignments.employeeId, assessment.employeeId),
            eq(schema.reviewAssignments.isActive, true),
          ),
        )
        .orderBy(desc(schema.reviewAssignments.createdAt))
        .limit(1);

      if (review) {
        const existingMeta = (review.metadata as Record<string, any>) ?? {};
        await this.db
          .update(schema.reviewAssignments)
          .set({
            metadata: {
              ...existingMeta,
              potentialRating: assessment.potentialRating,
              nineBoxNotes: assessment.notes,
              nineBoxAssessedBy: managerId,
              nineBoxAssessedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.reviewAssignments.id, review.id));
        updated.push(assessment.employeeId);
      }
    }

    return { message: 'Nine-box assessments updated', updatedCount: updated.length, updatedEmployeeIds: updated };
  }

  async getSuccessionPlan(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [] };

    // Get development plans with career aspirations and target roles
    const plans = await this.db
      .select({
        employeeId: schema.developmentPlans.employeeId,
        targetRole: schema.developmentPlans.targetRole,
        careerAspiration: schema.developmentPlans.careerAspiration,
        progress: schema.developmentPlans.progress,
        gapAnalysis: schema.developmentPlans.gapAnalysis,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.developmentPlans)
      .innerJoin(schema.users, eq(schema.developmentPlans.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.developmentPlans.orgId, orgId),
          inArray(schema.developmentPlans.employeeId, teamIds),
          eq(schema.developmentPlans.isActive, true),
          eq(schema.developmentPlans.status, 'active'),
        ),
      );

    // Get team member designations
    const profiles = await this.db
      .select({
        userId: schema.employeeProfiles.userId,
        designationId: schema.employeeProfiles.designationId,
      })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          inArray(schema.employeeProfiles.userId, teamIds),
        ),
      );

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Group by target role
    const roleMap = new Map<string, Array<Record<string, any>>>();
    for (const plan of plans) {
      const role = plan.targetRole ?? 'Unspecified';
      const existing = roleMap.get(role) ?? [];
      existing.push({
        employeeId: plan.employeeId,
        name: `${plan.firstName} ${plan.lastName ?? ''}`.trim(),
        careerAspiration: plan.careerAspiration,
        readinessProgress: plan.progress,
        gapAnalysis: plan.gapAnalysis,
        currentDesignationId: profileMap.get(plan.employeeId)?.designationId ?? null,
      });
      roleMap.set(role, existing);
    }

    const data = [...roleMap.entries()].map(([role, candidates]) => ({
      targetRole: role,
      candidates: candidates.sort((a, b) => (b.readinessProgress ?? 0) - (a.readinessProgress ?? 0)),
    }));

    return { data };
  }

  async updateSuccessionPlan(orgId: string, managerId: string, body: {
    plans: Array<{
      employeeId: string;
      targetRole: string;
      readinessLevel?: string;
      notes?: string;
      timeframe?: string;
    }>;
  }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    const updated: string[] = [];

    for (const plan of body.plans) {
      if (!teamIds.includes(plan.employeeId)) continue;

      // Get or update dev plan
      const [existing] = await this.db
        .select({ id: schema.developmentPlans.id, metadata: schema.developmentPlans.metadata })
        .from(schema.developmentPlans)
        .where(
          and(
            eq(schema.developmentPlans.orgId, orgId),
            eq(schema.developmentPlans.employeeId, plan.employeeId),
            eq(schema.developmentPlans.isActive, true),
          ),
        )
        .orderBy(desc(schema.developmentPlans.createdAt))
        .limit(1);

      if (existing) {
        const existingMeta = (existing.metadata as Record<string, any>) ?? {};
        await this.db
          .update(schema.developmentPlans)
          .set({
            targetRole: plan.targetRole,
            metadata: {
              ...existingMeta,
              successionReadiness: plan.readinessLevel,
              successionNotes: plan.notes,
              successionTimeframe: plan.timeframe,
              updatedBy: managerId,
              updatedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.developmentPlans.id, existing.id));
        updated.push(plan.employeeId);
      }
    }

    return { message: 'Succession plans updated', updatedCount: updated.length };
  }

  async getHighPotentials(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    // Get reviews with high ratings
    const reviews = await this.db
      .select({
        employeeId: schema.reviewAssignments.employeeId,
        finalRating: schema.reviewAssignments.finalRating,
        calibratedRating: schema.reviewAssignments.calibratedRating,
        metadata: schema.reviewAssignments.metadata,
        achievements: schema.reviewAssignments.achievements,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.reviewAssignments.orgId, orgId),
          inArray(schema.reviewAssignments.employeeId, teamIds),
          eq(schema.reviewAssignments.isActive, true),
        ),
      )
      .orderBy(desc(schema.reviewAssignments.createdAt));

    // Deduplicate and filter high potentials
    const latestMap = new Map<string, typeof reviews[0]>();
    for (const r of reviews) {
      if (!latestMap.has(r.employeeId)) latestMap.set(r.employeeId, r);
    }

    const highPotentials: Array<Record<string, any>> = [];
    for (const [empId, r] of latestMap) {
      const rating = Number(r.calibratedRating ?? r.finalRating ?? 0);
      const meta = (r.metadata as Record<string, any>) ?? {};
      const potential = Number(meta.potentialRating ?? rating);

      if (rating >= 3.5 || potential >= 3.5) {
        highPotentials.push({
          employeeId: empId,
          name: `${r.firstName} ${r.lastName ?? ''}`.trim(),
          performanceRating: rating,
          potentialRating: potential,
          achievements: r.achievements,
        });
      }
    }

    highPotentials.sort((a, b) => (b.potentialRating + b.performanceRating) - (a.potentialRating + a.performanceRating));

    return { data: highPotentials, meta: { total: highPotentials.length } };
  }

  async getReadinessAssessments(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    // Get development plans with readiness data
    const plans = await this.db
      .select({
        employeeId: schema.developmentPlans.employeeId,
        targetRole: schema.developmentPlans.targetRole,
        progress: schema.developmentPlans.progress,
        skills: schema.developmentPlans.skills,
        certifications: schema.developmentPlans.certifications,
        gapAnalysis: schema.developmentPlans.gapAnalysis,
        metadata: schema.developmentPlans.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.developmentPlans)
      .innerJoin(schema.users, eq(schema.developmentPlans.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.developmentPlans.orgId, orgId),
          inArray(schema.developmentPlans.employeeId, teamIds),
          eq(schema.developmentPlans.isActive, true),
        ),
      );

    // Get goal completion rate for each team member
    const goalStats = await this.db
      .select({
        employeeId: schema.goals.employeeId,
        totalGoals: sql<number>`count(*)::int`,
        completedGoals: sql<number>`count(*) filter (where ${schema.goals.status} = 'completed')::int`,
      })
      .from(schema.goals)
      .where(
        and(
          eq(schema.goals.orgId, orgId),
          inArray(schema.goals.employeeId, teamIds),
          eq(schema.goals.isActive, true),
        ),
      )
      .groupBy(schema.goals.employeeId);

    const goalMap = new Map(goalStats.map((g) => [g.employeeId, g]));

    const data = plans.map((p) => {
      const goals = goalMap.get(p.employeeId);
      const goalCompletionRate = goals ? Math.round((goals.completedGoals / (goals.totalGoals || 1)) * 100) : 0;
      const meta = (p.metadata as Record<string, any>) ?? {};

      return {
        employeeId: p.employeeId,
        name: `${p.firstName} ${p.lastName ?? ''}`.trim(),
        targetRole: p.targetRole,
        developmentProgress: p.progress,
        goalCompletionRate,
        skillsCount: (p.skills as any[])?.length ?? 0,
        certificationsCount: (p.certifications as any[])?.length ?? 0,
        gapAnalysis: p.gapAnalysis,
        readinessLevel: meta.successionReadiness ?? 'not_assessed',
        timeframe: meta.successionTimeframe,
      };
    });

    return { data, meta: { total: data.length } };
  }
}
