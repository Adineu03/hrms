import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class GoalManagementService {
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

  private async verifyTeamMember(orgId: string, managerId: string, employeeId: string | null) {
    if (!employeeId) throw new ForbiddenException('Employee ID is required');
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(employeeId)) {
      throw new ForbiddenException('Employee is not a direct report');
    }
  }

  async listTeamGoals(orgId: string, managerId: string, filters?: { status?: string; category?: string; employeeId?: string }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    const targetIds = filters?.employeeId ? [filters.employeeId] : teamIds;
    const conditions: any[] = [
      eq(schema.goals.orgId, orgId),
      inArray(schema.goals.employeeId, targetIds),
      eq(schema.goals.isActive, true),
      eq(schema.goals.isTemplate, false),
    ];
    if (filters?.status) conditions.push(eq(schema.goals.status, filters.status));
    if (filters?.category) conditions.push(eq(schema.goals.category, filters.category));

    const rows = await this.db
      .select({
        id: schema.goals.id,
        employeeId: schema.goals.employeeId,
        title: schema.goals.title,
        description: schema.goals.description,
        category: schema.goals.category,
        framework: schema.goals.framework,
        status: schema.goals.status,
        progress: schema.goals.progress,
        weightage: schema.goals.weightage,
        priority: schema.goals.priority,
        startDate: schema.goals.startDate,
        dueDate: schema.goals.dueDate,
        parentGoalId: schema.goals.parentGoalId,
        alignedOrgGoalId: schema.goals.alignedOrgGoalId,
        metadata: schema.goals.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.goals.createdAt,
        updatedAt: schema.goals.updatedAt,
      })
      .from(schema.goals)
      .innerJoin(schema.users, eq(schema.goals.employeeId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.goals.updatedAt));

    return {
      data: rows.map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        weightage: r.weightage ? Number(r.weightage) : 0,
        progress: r.progress ? Number(r.progress) : 0,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
      })),
      meta: { total: rows.length },
    };
  }

  async createGoalForEmployee(orgId: string, managerId: string, body: {
    employeeId: string;
    title: string;
    description?: string;
    category?: string;
    framework?: string;
    priority?: string;
    weightage?: number;
    startDate?: string;
    dueDate?: string;
    parentGoalId?: string;
    alignedOrgGoalId?: string;
    measurementCriteria?: string;
    targetValue?: number;
    unit?: string;
    successMetrics?: any[];
  }) {
    await this.verifyTeamMember(orgId, managerId, body.employeeId);

    const [goal] = await this.db
      .insert(schema.goals)
      .values({
        orgId,
        employeeId: body.employeeId,
        title: body.title,
        description: body.description,
        category: body.category ?? 'individual',
        framework: body.framework ?? 'okr',
        priority: body.priority ?? 'medium',
        weightage: body.weightage?.toString() ?? '100',
        startDate: body.startDate,
        dueDate: body.dueDate,
        parentGoalId: body.parentGoalId,
        alignedOrgGoalId: body.alignedOrgGoalId,
        measurementCriteria: body.measurementCriteria,
        targetValue: body.targetValue?.toString(),
        unit: body.unit,
        successMetrics: body.successMetrics ?? [],
        createdBy: managerId,
        isTemplate: false,
        status: 'active',
      })
      .returning();

    return goal;
  }

  async getGoal(orgId: string, id: string) {
    const [goal] = await this.db
      .select({
        id: schema.goals.id,
        orgId: schema.goals.orgId,
        employeeId: schema.goals.employeeId,
        title: schema.goals.title,
        description: schema.goals.description,
        category: schema.goals.category,
        framework: schema.goals.framework,
        status: schema.goals.status,
        progress: schema.goals.progress,
        weightage: schema.goals.weightage,
        priority: schema.goals.priority,
        startDate: schema.goals.startDate,
        dueDate: schema.goals.dueDate,
        completedAt: schema.goals.completedAt,
        parentGoalId: schema.goals.parentGoalId,
        alignedOrgGoalId: schema.goals.alignedOrgGoalId,
        measurementCriteria: schema.goals.measurementCriteria,
        successMetrics: schema.goals.successMetrics,
        targetValue: schema.goals.targetValue,
        currentValue: schema.goals.currentValue,
        unit: schema.goals.unit,
        createdBy: schema.goals.createdBy,
        metadata: schema.goals.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.goals.createdAt,
        updatedAt: schema.goals.updatedAt,
      })
      .from(schema.goals)
      .innerJoin(schema.users, eq(schema.goals.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.goals.id, id),
          eq(schema.goals.orgId, orgId),
          eq(schema.goals.isActive, true),
        ),
      );

    if (!goal) throw new NotFoundException('Goal not found');

    // Fetch updates
    const updates = await this.db
      .select()
      .from(schema.goalUpdates)
      .where(
        and(
          eq(schema.goalUpdates.goalId, id),
          eq(schema.goalUpdates.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.goalUpdates.createdAt));

    return {
      ...goal,
      employeeName: `${goal.firstName} ${goal.lastName ?? ''}`.trim(),
      weightage: goal.weightage ? Number(goal.weightage) : 0,
      progress: goal.progress ? Number(goal.progress) : 0,
      targetValue: goal.targetValue ? Number(goal.targetValue) : null,
      currentValue: goal.currentValue ? Number(goal.currentValue) : 0,
      completedAt: goal.completedAt?.toISOString?.() ?? null,
      createdAt: goal.createdAt?.toISOString?.() ?? goal.createdAt,
      updatedAt: goal.updatedAt?.toISOString?.() ?? goal.updatedAt,
      updates: updates.map((u) => ({
        ...u,
        createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
      })),
    };
  }

  async updateGoal(orgId: string, managerId: string, id: string, body: {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    weightage?: number;
    startDate?: string;
    dueDate?: string;
    status?: string;
    measurementCriteria?: string;
    targetValue?: number;
    unit?: string;
    successMetrics?: any[];
  }) {
    const [existing] = await this.db
      .select({ id: schema.goals.id, employeeId: schema.goals.employeeId })
      .from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId), eq(schema.goals.isActive, true)));

    if (!existing) throw new NotFoundException('Goal not found');
    await this.verifyTeamMember(orgId, managerId, existing.employeeId);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.weightage !== undefined) updateData.weightage = body.weightage.toString();
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
    if (body.measurementCriteria !== undefined) updateData.measurementCriteria = body.measurementCriteria;
    if (body.targetValue !== undefined) updateData.targetValue = body.targetValue.toString();
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.successMetrics !== undefined) updateData.successMetrics = body.successMetrics;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') updateData.completedAt = new Date();
    }

    const [updated] = await this.db
      .update(schema.goals)
      .set(updateData)
      .where(eq(schema.goals.id, id))
      .returning();

    return updated;
  }

  async softDeleteGoal(orgId: string, id: string) {
    const [existing] = await this.db
      .select({ id: schema.goals.id })
      .from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId), eq(schema.goals.isActive, true)));

    if (!existing) throw new NotFoundException('Goal not found');

    await this.db
      .update(schema.goals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.goals.id, id));

    return { message: 'Goal deleted successfully', id };
  }

  async approveGoalModification(orgId: string, managerId: string, id: string) {
    const [goal] = await this.db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId), eq(schema.goals.isActive, true)));

    if (!goal) throw new NotFoundException('Goal not found');
    await this.verifyTeamMember(orgId, managerId, goal.employeeId);

    const meta = (goal.metadata as Record<string, any>) ?? {};
    const modReq = meta.modificationRequest;
    if (!modReq || modReq.status !== 'pending') {
      throw new BadRequestException('No pending modification request');
    }

    // Apply requested changes
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (modReq.requestedChanges?.dueDate) updateData.dueDate = modReq.requestedChanges.dueDate;
    if (modReq.requestedChanges?.title) updateData.title = modReq.requestedChanges.title;
    if (modReq.requestedChanges?.description) updateData.description = modReq.requestedChanges.description;
    updateData.metadata = { ...meta, modificationRequest: { ...modReq, status: 'approved', approvedBy: managerId, approvedAt: new Date().toISOString() } };

    const [updated] = await this.db
      .update(schema.goals)
      .set(updateData)
      .where(eq(schema.goals.id, id))
      .returning();

    return { message: 'Modification approved', goal: updated };
  }

  async rejectGoalModification(orgId: string, managerId: string, id: string, body: { reason?: string }) {
    const [goal] = await this.db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.orgId, orgId), eq(schema.goals.isActive, true)));

    if (!goal) throw new NotFoundException('Goal not found');
    await this.verifyTeamMember(orgId, managerId, goal.employeeId);

    const meta = (goal.metadata as Record<string, any>) ?? {};
    const modReq = meta.modificationRequest;
    if (!modReq || modReq.status !== 'pending') {
      throw new BadRequestException('No pending modification request');
    }

    const [updated] = await this.db
      .update(schema.goals)
      .set({
        metadata: { ...meta, modificationRequest: { ...modReq, status: 'rejected', rejectedBy: managerId, rejectedAt: new Date().toISOString(), rejectionReason: body.reason } },
        updatedAt: new Date(),
      })
      .where(eq(schema.goals.id, id))
      .returning();

    return { message: 'Modification rejected', goal: updated };
  }

  async getCascadedGoals(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    // Org-level goals
    const orgGoals = await this.db
      .select()
      .from(schema.goals)
      .where(
        and(
          eq(schema.goals.orgId, orgId),
          eq(schema.goals.isActive, true),
          eq(schema.goals.isTemplate, false),
          sql`${schema.goals.parentGoalId} is null`,
          eq(schema.goals.category, 'organizational'),
        ),
      )
      .orderBy(schema.goals.title);

    // Team goals
    const teamGoals = teamIds.length > 0
      ? await this.db
          .select({
            id: schema.goals.id,
            employeeId: schema.goals.employeeId,
            title: schema.goals.title,
            category: schema.goals.category,
            status: schema.goals.status,
            progress: schema.goals.progress,
            parentGoalId: schema.goals.parentGoalId,
            alignedOrgGoalId: schema.goals.alignedOrgGoalId,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
          })
          .from(schema.goals)
          .innerJoin(schema.users, eq(schema.goals.employeeId, schema.users.id))
          .where(
            and(
              eq(schema.goals.orgId, orgId),
              inArray(schema.goals.employeeId, teamIds),
              eq(schema.goals.isActive, true),
              eq(schema.goals.isTemplate, false),
            ),
          )
          .orderBy(schema.goals.title)
      : [];

    // Manager's own goals
    const managerGoals = await this.db
      .select()
      .from(schema.goals)
      .where(
        and(
          eq(schema.goals.orgId, orgId),
          eq(schema.goals.employeeId, managerId),
          eq(schema.goals.isActive, true),
          eq(schema.goals.isTemplate, false),
        ),
      )
      .orderBy(schema.goals.title);

    return {
      organizational: orgGoals.map((g) => ({
        id: g.id, title: g.title, status: g.status, progress: Number(g.progress) || 0,
      })),
      manager: managerGoals.map((g) => ({
        id: g.id, title: g.title, status: g.status, progress: Number(g.progress) || 0, alignedOrgGoalId: g.alignedOrgGoalId,
      })),
      team: teamGoals.map((g) => ({
        id: g.id, employeeId: g.employeeId,
        employeeName: `${g.firstName} ${g.lastName ?? ''}`.trim(),
        title: g.title, category: g.category, status: g.status,
        progress: Number(g.progress) || 0, parentGoalId: g.parentGoalId, alignedOrgGoalId: g.alignedOrgGoalId,
      })),
    };
  }
}
