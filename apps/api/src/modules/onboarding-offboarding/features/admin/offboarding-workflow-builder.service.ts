import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OffboardingWorkflowBuilderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listWorkflows(
    orgId: string,
    filters: { exitType?: string; departmentId?: string; page?: number; limit?: number },
  ) {
    const conditions: any[] = [
      eq(schema.offboardingWorkflows.orgId, orgId),
      eq(schema.offboardingWorkflows.isActive, true),
    ];

    if (filters.exitType) {
      conditions.push(eq(schema.offboardingWorkflows.exitType, filters.exitType));
    }
    if (filters.departmentId) {
      conditions.push(eq(schema.offboardingWorkflows.departmentId, filters.departmentId));
    }

    const rows = await this.db
      .select({
        workflow: schema.offboardingWorkflows,
        department: schema.departments,
      })
      .from(schema.offboardingWorkflows)
      .leftJoin(schema.departments, eq(schema.offboardingWorkflows.departmentId, schema.departments.id))
      .where(and(...conditions))
      .orderBy(desc(schema.offboardingWorkflows.createdAt));

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
    const [created] = await this.db
      .insert(schema.offboardingWorkflows)
      .values({
        orgId,
        name: data.name,
        description: data.description ?? null,
        exitType: data.exitType ?? 'resignation',
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        clearanceDepartments: data.clearanceDepartments ?? [],
        assetChecklist: data.assetChecklist ?? [],
        settlementChecklist: data.settlementChecklist ?? [],
        isTemplate: data.isTemplate ?? true,
        taskCount: data.taskCount ?? 0,
        status: data.status ?? 'draft',
        createdBy,
        metadata: data.metadata ?? {},
      })
      .returning();

    return this.getWorkflow(orgId, created.id);
  }

  async getWorkflow(orgId: string, id: string) {
    const [row] = await this.db
      .select({
        workflow: schema.offboardingWorkflows,
        department: schema.departments,
      })
      .from(schema.offboardingWorkflows)
      .leftJoin(schema.departments, eq(schema.offboardingWorkflows.departmentId, schema.departments.id))
      .where(
        and(
          eq(schema.offboardingWorkflows.id, id),
          eq(schema.offboardingWorkflows.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Offboarding workflow not found');

    return this.toWorkflowDto(row);
  }

  async updateWorkflow(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.offboardingWorkflows.id })
      .from(schema.offboardingWorkflows)
      .where(and(eq(schema.offboardingWorkflows.id, id), eq(schema.offboardingWorkflows.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Offboarding workflow not found');

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'description', 'exitType', 'departmentId', 'designationId',
      'clearanceDepartments', 'assetChecklist', 'settlementChecklist',
      'isTemplate', 'taskCount', 'status', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    await this.db
      .update(schema.offboardingWorkflows)
      .set(updates)
      .where(and(eq(schema.offboardingWorkflows.id, id), eq(schema.offboardingWorkflows.orgId, orgId)));

    return this.getWorkflow(orgId, id);
  }

  async softDelete(orgId: string, id: string) {
    const [existing] = await this.db
      .select({ id: schema.offboardingWorkflows.id })
      .from(schema.offboardingWorkflows)
      .where(and(eq(schema.offboardingWorkflows.id, id), eq(schema.offboardingWorkflows.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Offboarding workflow not found');

    await this.db
      .update(schema.offboardingWorkflows)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.offboardingWorkflows.id, id), eq(schema.offboardingWorkflows.orgId, orgId)));

    return { success: true, message: 'Offboarding workflow deleted' };
  }

  async cloneWorkflow(orgId: string, id: string, createdBy: string) {
    const source = await this.getWorkflow(orgId, id);

    const [cloned] = await this.db
      .insert(schema.offboardingWorkflows)
      .values({
        orgId,
        name: `${source.name} (Copy)`,
        description: source.description,
        exitType: source.exitType,
        departmentId: source.departmentId,
        designationId: source.designationId,
        clearanceDepartments: source.clearanceDepartments as any,
        assetChecklist: source.assetChecklist as any,
        settlementChecklist: source.settlementChecklist as any,
        isTemplate: true,
        taskCount: source.taskCount,
        status: 'draft',
        createdBy,
        metadata: source.metadata as any,
      })
      .returning();

    return this.getWorkflow(orgId, cloned.id);
  }

  private toWorkflowDto(row: {
    workflow: typeof schema.offboardingWorkflows.$inferSelect;
    department: typeof schema.departments.$inferSelect | null;
  }) {
    const w = row.workflow;
    return {
      id: w.id,
      orgId: w.orgId,
      name: w.name,
      description: w.description,
      exitType: w.exitType,
      departmentId: w.departmentId,
      departmentName: row.department?.name ?? null,
      designationId: w.designationId,
      clearanceDepartments: w.clearanceDepartments,
      assetChecklist: w.assetChecklist,
      settlementChecklist: w.settlementChecklist,
      isTemplate: w.isTemplate,
      taskCount: w.taskCount,
      status: w.status,
      createdBy: w.createdBy,
      metadata: w.metadata,
      isActive: w.isActive,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  }
}
