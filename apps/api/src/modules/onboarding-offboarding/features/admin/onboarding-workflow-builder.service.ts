import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OnboardingWorkflowBuilderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listWorkflows(
    orgId: string,
    filters: { status?: string; departmentId?: string; page?: number; limit?: number },
  ) {
    const conditions: any[] = [
      eq(schema.onboardingWorkflows.orgId, orgId),
      eq(schema.onboardingWorkflows.isActive, true),
    ];

    if (filters.status) {
      conditions.push(eq(schema.onboardingWorkflows.status, filters.status));
    }
    if (filters.departmentId) {
      conditions.push(eq(schema.onboardingWorkflows.departmentId, filters.departmentId));
    }

    const rows = await this.db
      .select({
        workflow: schema.onboardingWorkflows,
        department: schema.departments,
        designation: schema.designations,
      })
      .from(schema.onboardingWorkflows)
      .leftJoin(schema.departments, eq(schema.onboardingWorkflows.departmentId, schema.departments.id))
      .leftJoin(schema.designations, eq(schema.onboardingWorkflows.designationId, schema.designations.id))
      .where(and(...conditions))
      .orderBy(desc(schema.onboardingWorkflows.createdAt));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => this.toWorkflowDto(r)),
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.ceil(rows.length / limit),
      },
    };
  }

  async createWorkflow(orgId: string, createdBy: string, data: Record<string, any>) {
    const tasks = data.tasks ?? [];

    const [created] = await this.db
      .insert(schema.onboardingWorkflows)
      .values({
        orgId,
        name: data.name,
        description: data.description ?? null,
        workflowType: data.workflowType ?? 'onboarding',
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        locationId: data.locationId ?? null,
        employmentType: data.employmentType ?? null,
        gradeId: data.gradeId ?? null,
        isTemplate: data.isTemplate ?? true,
        taskCount: tasks.length,
        conditionalRules: data.conditionalRules ?? [],
        status: data.status ?? 'draft',
        createdBy,
        metadata: data.metadata ?? {},
      })
      .returning();

    // Create associated tasks
    if (tasks.length > 0) {
      await this.db.insert(schema.onboardingWorkflowTasks).values(
        tasks.map((task: Record<string, any>, index: number) => ({
          orgId,
          workflowId: created.id,
          title: task.title,
          description: task.description ?? null,
          taskType: task.taskType ?? 'general',
          taskOwner: task.taskOwner ?? 'hr',
          sortOrder: task.sortOrder ?? index,
          deadlineDays: task.deadlineDays ?? 7,
          isMandatory: task.isMandatory ?? true,
          isConditional: task.isConditional ?? false,
          conditionRules: task.conditionRules ?? {},
          documentRequired: task.documentRequired ?? false,
          documentType: task.documentType ?? null,
          trainingModuleId: task.trainingModuleId ?? null,
          metadata: task.metadata ?? {},
        })),
      );
    }

    return this.getWorkflow(orgId, created.id);
  }

  async getWorkflow(orgId: string, id: string) {
    const [row] = await this.db
      .select({
        workflow: schema.onboardingWorkflows,
        department: schema.departments,
        designation: schema.designations,
      })
      .from(schema.onboardingWorkflows)
      .leftJoin(schema.departments, eq(schema.onboardingWorkflows.departmentId, schema.departments.id))
      .leftJoin(schema.designations, eq(schema.onboardingWorkflows.designationId, schema.designations.id))
      .where(
        and(
          eq(schema.onboardingWorkflows.id, id),
          eq(schema.onboardingWorkflows.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Onboarding workflow not found');

    const tasks = await this.db
      .select()
      .from(schema.onboardingWorkflowTasks)
      .where(
        and(
          eq(schema.onboardingWorkflowTasks.workflowId, id),
          eq(schema.onboardingWorkflowTasks.orgId, orgId),
          eq(schema.onboardingWorkflowTasks.isActive, true),
        ),
      )
      .orderBy(schema.onboardingWorkflowTasks.sortOrder);

    return { ...this.toWorkflowDto(row), tasks };
  }

  async updateWorkflow(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.onboardingWorkflows.id })
      .from(schema.onboardingWorkflows)
      .where(and(eq(schema.onboardingWorkflows.id, id), eq(schema.onboardingWorkflows.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Onboarding workflow not found');

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'description', 'workflowType', 'departmentId', 'designationId',
      'locationId', 'employmentType', 'gradeId', 'isTemplate', 'conditionalRules',
      'status', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    await this.db
      .update(schema.onboardingWorkflows)
      .set(updates)
      .where(and(eq(schema.onboardingWorkflows.id, id), eq(schema.onboardingWorkflows.orgId, orgId)));

    return this.getWorkflow(orgId, id);
  }

  async softDelete(orgId: string, id: string) {
    const [existing] = await this.db
      .select({ id: schema.onboardingWorkflows.id })
      .from(schema.onboardingWorkflows)
      .where(and(eq(schema.onboardingWorkflows.id, id), eq(schema.onboardingWorkflows.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Onboarding workflow not found');

    await this.db
      .update(schema.onboardingWorkflows)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.onboardingWorkflows.id, id), eq(schema.onboardingWorkflows.orgId, orgId)));

    return { success: true, message: 'Onboarding workflow deleted' };
  }

  async addTask(orgId: string, workflowId: string, data: Record<string, any>) {
    const [workflow] = await this.db
      .select({ id: schema.onboardingWorkflows.id, taskCount: schema.onboardingWorkflows.taskCount })
      .from(schema.onboardingWorkflows)
      .where(and(eq(schema.onboardingWorkflows.id, workflowId), eq(schema.onboardingWorkflows.orgId, orgId)))
      .limit(1);

    if (!workflow) throw new NotFoundException('Onboarding workflow not found');

    const [task] = await this.db
      .insert(schema.onboardingWorkflowTasks)
      .values({
        orgId,
        workflowId,
        title: data.title,
        description: data.description ?? null,
        taskType: data.taskType ?? 'general',
        taskOwner: data.taskOwner ?? 'hr',
        sortOrder: data.sortOrder ?? (workflow.taskCount + 1),
        deadlineDays: data.deadlineDays ?? 7,
        isMandatory: data.isMandatory ?? true,
        isConditional: data.isConditional ?? false,
        conditionRules: data.conditionRules ?? {},
        documentRequired: data.documentRequired ?? false,
        documentType: data.documentType ?? null,
        trainingModuleId: data.trainingModuleId ?? null,
        metadata: data.metadata ?? {},
      })
      .returning();

    // Update task count
    await this.db
      .update(schema.onboardingWorkflows)
      .set({ taskCount: sql`${schema.onboardingWorkflows.taskCount} + 1`, updatedAt: new Date() })
      .where(and(eq(schema.onboardingWorkflows.id, workflowId), eq(schema.onboardingWorkflows.orgId, orgId)));

    return task;
  }

  async updateTask(orgId: string, workflowId: string, taskId: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.onboardingWorkflowTasks.id })
      .from(schema.onboardingWorkflowTasks)
      .where(
        and(
          eq(schema.onboardingWorkflowTasks.id, taskId),
          eq(schema.onboardingWorkflowTasks.workflowId, workflowId),
          eq(schema.onboardingWorkflowTasks.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Workflow task not found');

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'title', 'description', 'taskType', 'taskOwner', 'sortOrder', 'deadlineDays',
      'isMandatory', 'isConditional', 'conditionRules', 'documentRequired',
      'documentType', 'trainingModuleId', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    await this.db
      .update(schema.onboardingWorkflowTasks)
      .set(updates)
      .where(
        and(
          eq(schema.onboardingWorkflowTasks.id, taskId),
          eq(schema.onboardingWorkflowTasks.orgId, orgId),
        ),
      );

    return this.getWorkflow(orgId, workflowId);
  }

  async removeTask(orgId: string, workflowId: string, taskId: string) {
    const [existing] = await this.db
      .select({ id: schema.onboardingWorkflowTasks.id })
      .from(schema.onboardingWorkflowTasks)
      .where(
        and(
          eq(schema.onboardingWorkflowTasks.id, taskId),
          eq(schema.onboardingWorkflowTasks.workflowId, workflowId),
          eq(schema.onboardingWorkflowTasks.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Workflow task not found');

    await this.db
      .update(schema.onboardingWorkflowTasks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.onboardingWorkflowTasks.id, taskId),
          eq(schema.onboardingWorkflowTasks.orgId, orgId),
        ),
      );

    // Decrement task count
    await this.db
      .update(schema.onboardingWorkflows)
      .set({
        taskCount: sql`GREATEST(${schema.onboardingWorkflows.taskCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.onboardingWorkflows.id, workflowId), eq(schema.onboardingWorkflows.orgId, orgId)));

    return { success: true, message: 'Task removed' };
  }

  async cloneWorkflow(orgId: string, id: string, createdBy: string) {
    const source = await this.getWorkflow(orgId, id);

    const [cloned] = await this.db
      .insert(schema.onboardingWorkflows)
      .values({
        orgId,
        name: `${source.name} (Copy)`,
        description: source.description,
        workflowType: source.workflowType,
        departmentId: source.departmentId,
        designationId: source.designationId,
        locationId: source.locationId,
        employmentType: source.employmentType,
        gradeId: source.gradeId,
        isTemplate: true,
        taskCount: source.tasks.length,
        conditionalRules: source.conditionalRules as any,
        status: 'draft',
        createdBy,
        metadata: source.metadata as any,
      })
      .returning();

    // Clone tasks
    if (source.tasks.length > 0) {
      await this.db.insert(schema.onboardingWorkflowTasks).values(
        source.tasks.map((task: any) => ({
          orgId,
          workflowId: cloned.id,
          title: task.title,
          description: task.description,
          taskType: task.taskType,
          taskOwner: task.taskOwner,
          sortOrder: task.sortOrder,
          deadlineDays: task.deadlineDays,
          isMandatory: task.isMandatory,
          isConditional: task.isConditional,
          conditionRules: task.conditionRules,
          documentRequired: task.documentRequired,
          documentType: task.documentType,
          trainingModuleId: task.trainingModuleId,
          metadata: task.metadata,
        })),
      );
    }

    return this.getWorkflow(orgId, cloned.id);
  }

  private toWorkflowDto(row: {
    workflow: typeof schema.onboardingWorkflows.$inferSelect;
    department: typeof schema.departments.$inferSelect | null;
    designation: typeof schema.designations.$inferSelect | null;
  }) {
    const w = row.workflow;
    return {
      id: w.id,
      orgId: w.orgId,
      name: w.name,
      description: w.description,
      workflowType: w.workflowType,
      departmentId: w.departmentId,
      departmentName: row.department?.name ?? null,
      designationId: w.designationId,
      designationName: row.designation?.name ?? null,
      locationId: w.locationId,
      employmentType: w.employmentType,
      gradeId: w.gradeId,
      isTemplate: w.isTemplate,
      taskCount: w.taskCount,
      conditionalRules: w.conditionalRules,
      status: w.status,
      createdBy: w.createdBy,
      metadata: w.metadata,
      isActive: w.isActive,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  }
}
