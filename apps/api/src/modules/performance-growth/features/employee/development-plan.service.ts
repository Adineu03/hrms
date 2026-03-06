import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DevelopmentPlanService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyDevelopmentPlan(orgId: string, userId: string) {
    const [row] = await this.db.select().from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.employeeId, userId), eq(schema.developmentPlans.isActive, true), eq(schema.developmentPlans.status, 'active')))
      .orderBy(desc(schema.developmentPlans.createdAt)).limit(1);
    return row ?? null;
  }

  async getAllPlans(orgId: string, userId: string) {
    const rows = await this.db.select().from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.employeeId, userId), eq(schema.developmentPlans.isActive, true)))
      .orderBy(desc(schema.developmentPlans.createdAt));
    return { data: rows };
  }

  async updatePlanProgress(orgId: string, userId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db.select().from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.employeeId, userId))).limit(1);
    if (!existing) throw new NotFoundException('Development plan not found');
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.activities !== undefined) updates.activities = data.activities;
    if (data.progress !== undefined) updates.progress = data.progress.toString();
    if (data.careerAspiration !== undefined) updates.careerAspiration = data.careerAspiration;
    await this.db.update(schema.developmentPlans).set(updates).where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId)));
    return this.getMyDevelopmentPlan(orgId, userId);
  }

  async logActivity(orgId: string, userId: string, id: string, data: Record<string, any>) {
    const plan = await this.getMyDevelopmentPlan(orgId, userId);
    if (!plan || plan.id !== id) throw new NotFoundException('Development plan not found');
    const activities = Array.isArray(plan.activities) ? [...(plan.activities as any[])] : [];
    activities.push({ title: data.title, type: data.type ?? 'learning', status: 'completed', completedAt: new Date().toISOString(), notes: data.notes ?? '' });
    await this.db.update(schema.developmentPlans).set({ activities, updatedAt: new Date() }).where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId)));
    return this.getMyDevelopmentPlan(orgId, userId);
  }

  async addCertification(orgId: string, userId: string, id: string, data: Record<string, any>) {
    const plan = await this.getMyDevelopmentPlan(orgId, userId);
    if (!plan || plan.id !== id) throw new NotFoundException('Development plan not found');
    const certs = Array.isArray(plan.certifications) ? [...(plan.certifications as any[])] : [];
    certs.push({ name: data.name, provider: data.provider ?? '', completedAt: data.completedAt ?? new Date().toISOString(), expiryDate: data.expiryDate ?? null });
    await this.db.update(schema.developmentPlans).set({ certifications: certs, updatedAt: new Date() }).where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId)));
    return this.getMyDevelopmentPlan(orgId, userId);
  }

  async getSkillsAssessment(orgId: string, userId: string) {
    const plans = await this.db.select().from(schema.developmentPlans)
      .where(and(eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.employeeId, userId), eq(schema.developmentPlans.isActive, true)));
    const allSkills: any[] = [];
    for (const p of plans) { if (Array.isArray(p.skills)) allSkills.push(...(p.skills as any[])); }
    return { skills: allSkills };
  }

  async updateSkillsAssessment(orgId: string, userId: string, data: Record<string, any>) {
    const plan = await this.getMyDevelopmentPlan(orgId, userId);
    if (!plan) return { success: false, message: 'No active development plan' };
    await this.db.update(schema.developmentPlans).set({ skills: data.skills ?? [], updatedAt: new Date() })
      .where(and(eq(schema.developmentPlans.id, plan.id), eq(schema.developmentPlans.orgId, orgId)));
    return { success: true };
  }

  async requestTraining(orgId: string, userId: string, data: Record<string, any>) {
    return { success: true, message: 'Training request submitted', request: { title: data.title, type: data.type, requestedAt: new Date().toISOString() } };
  }
}
