import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyGoalsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listMyGoals(orgId: string, userId: string, status?: string) {
    const conditions: any[] = [eq(schema.goals.orgId, orgId), eq(schema.goals.employeeId, userId), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)];
    if (status) conditions.push(eq(schema.goals.status, status));
    const rows = await this.db.select().from(schema.goals).where(and(...conditions)).orderBy(desc(schema.goals.createdAt));
    return { data: rows, meta: { total: rows.length } };
  }

  async getGoal(orgId: string, userId: string, id: string) {
    const [row] = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId), eq(schema.goals.employeeId, userId))).limit(1);
    if (!row) throw new NotFoundException('Goal not found');
    const updates = await this.db.select().from(schema.goalUpdates)
      .where(and(eq(schema.goalUpdates.goalId, id), eq(schema.goalUpdates.orgId, orgId))).orderBy(desc(schema.goalUpdates.createdAt));
    return { ...row, updates };
  }

  async updateGoalProgress(orgId: string, userId: string, id: string, data: Record<string, any>) {
    const goal = await this.getGoal(orgId, userId, id);
    const previousProgress = goal.progress;
    await this.db.insert(schema.goalUpdates).values({
      orgId, goalId: id, employeeId: userId, previousProgress: previousProgress,
      newProgress: data.progress?.toString() ?? previousProgress, comment: data.comment ?? null,
      evidence: data.evidence ?? [], milestoneTitle: data.milestoneTitle ?? null, milestoneCompleted: data.milestoneCompleted ?? false,
    });
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.progress !== undefined) updates.progress = data.progress.toString();
    if (data.currentValue !== undefined) updates.currentValue = data.currentValue.toString();
    if (data.progress !== undefined && Number(data.progress) >= 100) { updates.status = 'completed'; updates.completedAt = new Date(); }
    await this.db.update(schema.goals).set(updates).where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId)));
    return this.getGoal(orgId, userId, id);
  }

  async requestModification(orgId: string, userId: string, id: string, data: Record<string, any>) {
    await this.getGoal(orgId, userId, id);
    const meta = { modificationRequest: { reason: data.reason, requestedChanges: data.changes, requestedAt: new Date().toISOString() } };
    await this.db.update(schema.goals).set({ metadata: meta, updatedAt: new Date() }).where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId)));
    return { success: true, message: 'Modification request submitted' };
  }

  async addPersonalGoal(orgId: string, userId: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.goals).values({
      orgId, employeeId: userId, title: data.title, description: data.description ?? null,
      category: 'individual', framework: data.framework ?? 'smart',
      startDate: data.startDate ?? null, dueDate: data.dueDate ?? null, status: 'active', createdBy: userId,
      isTemplate: false, metadata: { isPersonal: true },
    }).returning();
    return created;
  }

  async getGoalHistory(orgId: string, userId: string) {
    const rows = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.employeeId, userId), eq(schema.goals.status, 'completed'), eq(schema.goals.isActive, true)))
      .orderBy(desc(schema.goals.completedAt));
    return { data: rows };
  }

  async getGoalAlignment(orgId: string, userId: string) {
    const myGoals = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.employeeId, userId), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)));
    const orgGoals = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.category, 'organizational'), eq(schema.goals.isActive, true)));
    return { myGoals, orgGoals, alignments: myGoals.filter(g => g.alignedOrgGoalId).map(g => ({ goalId: g.id, goalTitle: g.title, alignedToId: g.alignedOrgGoalId, alignedToTitle: orgGoals.find(o => o.id === g.alignedOrgGoalId)?.title ?? null })) };
  }
}
