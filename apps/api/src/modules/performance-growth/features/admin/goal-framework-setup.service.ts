import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class GoalFrameworkSetupService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listGoalTemplates(orgId: string, category?: string) {
    const conditions: any[] = [eq(schema.goals.orgId, orgId), eq(schema.goals.isTemplate, true), eq(schema.goals.isActive, true)];
    if (category) conditions.push(eq(schema.goals.category, category));
    const rows = await this.db.select().from(schema.goals).where(and(...conditions)).orderBy(desc(schema.goals.createdAt));
    return { data: rows, meta: { total: rows.length } };
  }

  async createGoalTemplate(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.goals).values({
      orgId, title: data.title, description: data.description ?? null, category: data.category ?? 'individual',
      framework: data.framework ?? 'okr', measurementCriteria: data.measurementCriteria ?? null,
      successMetrics: data.successMetrics ?? [], targetValue: data.targetValue ?? null, unit: data.unit ?? null,
      weightage: data.weightage ?? '100', priority: data.priority ?? 'medium', isTemplate: true,
      templateRole: data.templateRole ?? null, createdBy, metadata: data.metadata ?? {},
    }).returning();
    return created;
  }

  async getGoalTemplate(orgId: string, id: string) {
    const [row] = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId), eq(schema.goals.isTemplate, true))).limit(1);
    if (!row) throw new NotFoundException('Goal template not found');
    return row;
  }

  async updateGoalTemplate(orgId: string, id: string, data: Record<string, any>) {
    await this.getGoalTemplate(orgId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = ['title', 'description', 'category', 'framework', 'measurementCriteria', 'successMetrics', 'targetValue', 'unit', 'weightage', 'priority', 'templateRole', 'metadata'];
    for (const f of fields) { if (data[f] !== undefined) updates[f] = data[f]; }
    await this.db.update(schema.goals).set(updates).where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId)));
    return this.getGoalTemplate(orgId, id);
  }

  async deleteGoalTemplate(orgId: string, id: string) {
    await this.getGoalTemplate(orgId, id);
    await this.db.update(schema.goals).set({ isActive: false, updatedAt: new Date() }).where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId)));
    return { success: true, message: 'Goal template deleted' };
  }

  async listOrgGoals(orgId: string) {
    const rows = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.category, 'organizational'), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)))
      .orderBy(desc(schema.goals.createdAt));
    return { data: rows, meta: { total: rows.length } };
  }

  async createOrgGoal(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.goals).values({
      orgId, title: data.title, description: data.description ?? null, category: 'organizational',
      framework: data.framework ?? 'okr', measurementCriteria: data.measurementCriteria ?? null,
      successMetrics: data.successMetrics ?? [], targetValue: data.targetValue ?? null, unit: data.unit ?? null,
      startDate: data.startDate ?? null, dueDate: data.dueDate ?? null, status: data.status ?? 'active',
      createdBy, isTemplate: false, metadata: data.metadata ?? {},
    }).returning();
    return created;
  }

  async getGoalStats(orgId: string) {
    const allGoals = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)));
    const total = allGoals.length;
    const completed = allGoals.filter(g => g.status === 'completed').length;
    const active = allGoals.filter(g => g.status === 'active' || g.status === 'on_track').length;
    const atRisk = allGoals.filter(g => g.status === 'at_risk' || g.status === 'behind').length;
    return { total, completed, active, atRisk, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }
}
