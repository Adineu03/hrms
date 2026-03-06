import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamDevelopmentService {
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

  async listTeamDevelopmentPlans(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    const rows = await this.db
      .select({
        id: schema.developmentPlans.id,
        employeeId: schema.developmentPlans.employeeId,
        title: schema.developmentPlans.title,
        description: schema.developmentPlans.description,
        type: schema.developmentPlans.type,
        status: schema.developmentPlans.status,
        progress: schema.developmentPlans.progress,
        targetRole: schema.developmentPlans.targetRole,
        startDate: schema.developmentPlans.startDate,
        targetDate: schema.developmentPlans.targetDate,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.developmentPlans.createdAt,
        updatedAt: schema.developmentPlans.updatedAt,
      })
      .from(schema.developmentPlans)
      .innerJoin(schema.users, eq(schema.developmentPlans.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.developmentPlans.orgId, orgId),
          inArray(schema.developmentPlans.employeeId, teamIds),
          eq(schema.developmentPlans.isActive, true),
        ),
      )
      .orderBy(desc(schema.developmentPlans.updatedAt));

    return {
      data: rows.map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        startDate: r.startDate ?? null,
        targetDate: r.targetDate ?? null,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
      })),
      meta: { total: rows.length },
    };
  }

  async createDevelopmentPlan(orgId: string, managerId: string, body: {
    employeeId: string;
    title: string;
    description?: string;
    type?: string;
    targetRole?: string;
    careerAspiration?: string;
    activities?: any[];
    skills?: any[];
    startDate?: string;
    targetDate?: string;
    mentorId?: string;
  }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(body.employeeId)) {
      throw new NotFoundException('Employee is not a direct report');
    }

    const [plan] = await this.db
      .insert(schema.developmentPlans)
      .values({
        orgId,
        employeeId: body.employeeId,
        title: body.title,
        description: body.description,
        type: body.type ?? 'idp',
        targetRole: body.targetRole,
        careerAspiration: body.careerAspiration,
        activities: body.activities ?? [],
        skills: body.skills ?? [],
        startDate: body.startDate ?? new Date().toISOString().split('T')[0],
        targetDate: body.targetDate,
        mentorId: body.mentorId,
        createdBy: managerId,
        status: 'active',
      })
      .returning();

    return { message: 'Development plan created successfully', plan };
  }

  async getDevelopmentPlan(orgId: string, id: string) {
    const [plan] = await this.db
      .select({
        id: schema.developmentPlans.id,
        employeeId: schema.developmentPlans.employeeId,
        title: schema.developmentPlans.title,
        description: schema.developmentPlans.description,
        type: schema.developmentPlans.type,
        status: schema.developmentPlans.status,
        activities: schema.developmentPlans.activities,
        skills: schema.developmentPlans.skills,
        certifications: schema.developmentPlans.certifications,
        careerAspiration: schema.developmentPlans.careerAspiration,
        targetRole: schema.developmentPlans.targetRole,
        gapAnalysis: schema.developmentPlans.gapAnalysis,
        mentorId: schema.developmentPlans.mentorId,
        progress: schema.developmentPlans.progress,
        startDate: schema.developmentPlans.startDate,
        targetDate: schema.developmentPlans.targetDate,
        completedAt: schema.developmentPlans.completedAt,
        metadata: schema.developmentPlans.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.developmentPlans.createdAt,
        updatedAt: schema.developmentPlans.updatedAt,
      })
      .from(schema.developmentPlans)
      .innerJoin(schema.users, eq(schema.developmentPlans.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.developmentPlans.id, id),
          eq(schema.developmentPlans.orgId, orgId),
          eq(schema.developmentPlans.isActive, true),
        ),
      );

    if (!plan) throw new NotFoundException('Development plan not found');

    // Fetch mentor info if present
    let mentorName: string | null = null;
    if (plan.mentorId) {
      const [mentor] = await this.db
        .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.id, plan.mentorId));
      if (mentor) mentorName = `${mentor.firstName} ${mentor.lastName ?? ''}`.trim();
    }

    return {
      ...plan,
      employeeName: `${plan.firstName} ${plan.lastName ?? ''}`.trim(),
      mentorName,
      startDate: plan.startDate ?? null,
      targetDate: plan.targetDate ?? null,
      completedAt: plan.completedAt?.toISOString?.() ?? null,
      createdAt: plan.createdAt?.toISOString?.() ?? plan.createdAt,
      updatedAt: plan.updatedAt?.toISOString?.() ?? plan.updatedAt,
    };
  }

  async updateDevelopmentPlan(orgId: string, id: string, body: {
    title?: string;
    description?: string;
    status?: string;
    activities?: any[];
    skills?: any[];
    targetRole?: string;
    careerAspiration?: string;
    gapAnalysis?: any;
    mentorId?: string;
    progress?: number;
    targetDate?: string;
  }) {
    const [existing] = await this.db
      .select({ id: schema.developmentPlans.id })
      .from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.isActive, true)));

    if (!existing) throw new NotFoundException('Development plan not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') updateData.completedAt = new Date();
    }
    if (body.activities !== undefined) updateData.activities = body.activities;
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.targetRole !== undefined) updateData.targetRole = body.targetRole;
    if (body.careerAspiration !== undefined) updateData.careerAspiration = body.careerAspiration;
    if (body.gapAnalysis !== undefined) updateData.gapAnalysis = body.gapAnalysis;
    if (body.mentorId !== undefined) updateData.mentorId = body.mentorId;
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.targetDate !== undefined) updateData.targetDate = new Date(body.targetDate);

    const [updated] = await this.db
      .update(schema.developmentPlans)
      .set(updateData)
      .where(eq(schema.developmentPlans.id, id))
      .returning();

    return updated;
  }

  async getTeamSkillGaps(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    // Get all development plans with gap analysis for team
    const plans = await this.db
      .select({
        employeeId: schema.developmentPlans.employeeId,
        skills: schema.developmentPlans.skills,
        gapAnalysis: schema.developmentPlans.gapAnalysis,
        targetRole: schema.developmentPlans.targetRole,
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

    // Aggregate skill gaps across team
    const skillGapMap = new Map<string, { skill: string; count: number; employees: Array<string> }>();
    for (const plan of plans) {
      const gaps = (plan.gapAnalysis as Record<string, any>)?.skills ?? [];
      const employeeName = `${plan.firstName} ${plan.lastName ?? ''}`.trim();
      for (const gap of gaps) {
        const skillName = typeof gap === 'string' ? gap : gap.name ?? gap.skill ?? 'Unknown';
        const existing = skillGapMap.get(skillName) ?? { skill: skillName, count: 0, employees: [] as string[] };
        existing.count++;
        existing.employees.push(employeeName);
        skillGapMap.set(skillName, existing);
      }
    }

    const data = [...skillGapMap.values()].sort((a, b) => b.count - a.count);

    return { data, meta: { total: data.length } };
  }

  async addActivity(orgId: string, id: string, body: {
    title: string;
    type?: string;
    description?: string;
    dueDate?: string;
    status?: string;
  }) {
    const [plan] = await this.db
      .select({ id: schema.developmentPlans.id, activities: schema.developmentPlans.activities })
      .from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.isActive, true)));

    if (!plan) throw new NotFoundException('Development plan not found');

    const activities = [...((plan.activities as any[]) ?? [])];
    activities.push({
      ...body,
      status: body.status ?? 'pending',
      addedAt: new Date().toISOString(),
    });

    await this.db
      .update(schema.developmentPlans)
      .set({ activities, updatedAt: new Date() })
      .where(eq(schema.developmentPlans.id, id));

    return { message: 'Activity added successfully', activity: activities[activities.length - 1], totalActivities: activities.length };
  }

  async recommendTraining(orgId: string, id: string, body: {
    trainingName: string;
    provider?: string;
    url?: string;
    type?: string;
    reason?: string;
    priority?: string;
  }) {
    const [plan] = await this.db
      .select({ id: schema.developmentPlans.id, metadata: schema.developmentPlans.metadata })
      .from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.isActive, true)));

    if (!plan) throw new NotFoundException('Development plan not found');

    const existingMeta = (plan.metadata as Record<string, any>) ?? {};
    const recommendations = existingMeta.trainingRecommendations ?? [];
    recommendations.push({
      ...body,
      recommendedAt: new Date().toISOString(),
      status: 'recommended',
    });

    await this.db
      .update(schema.developmentPlans)
      .set({
        metadata: { ...existingMeta, trainingRecommendations: recommendations },
        updatedAt: new Date(),
      })
      .where(eq(schema.developmentPlans.id, id));

    return { message: 'Training recommended successfully', recommendation: recommendations[recommendations.length - 1] };
  }
}
