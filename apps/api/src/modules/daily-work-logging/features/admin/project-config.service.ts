import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ProjectConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ────────────────────────────── Projects ──────────────────────────────

  async listProjects(orgId: string, statusFilter?: string) {
    const conditions: any[] = [eq(schema.projects.orgId, orgId)];

    if (statusFilter) {
      conditions.push(eq(schema.projects.status, statusFilter));
    }

    const rows = await this.db
      .select()
      .from(schema.projects)
      .where(and(...conditions))
      .orderBy(desc(schema.projects.createdAt));

    return rows.map((r) => this.toProjectDto(r));
  }

  async createProject(orgId: string, data: Record<string, any>) {
    if (!data.name || !data.code) {
      throw new BadRequestException('name and code are required');
    }

    // Check for duplicate code within the org
    const [existingCode] = await this.db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.orgId, orgId),
          eq(schema.projects.code, data.code),
          eq(schema.projects.isActive, true),
        ),
      )
      .limit(1);

    if (existingCode) {
      throw new BadRequestException(`Project code "${data.code}" already exists`);
    }

    const [created] = await this.db
      .insert(schema.projects)
      .values({
        orgId,
        name: data.name,
        code: data.code,
        clientName: data.clientName ?? null,
        description: data.description ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        budgetHours: data.budgetHours ?? null,
        isBillable: data.isBillable ?? true,
        billableRate: data.billableRate ?? null,
        currency: data.currency ?? 'USD',
        status: data.status ?? 'active',
        color: data.color ?? '#4F46E5',
        metadata: data.metadata ?? {},
        isActive: true,
      })
      .returning();

    return this.toProjectDto(created);
  }

  async updateProject(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, id),
          eq(schema.projects.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Project not found');

    // If code is being changed, check for duplicates
    if (data.code && data.code !== existing.code) {
      const [duplicate] = await this.db
        .select()
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.orgId, orgId),
            eq(schema.projects.code, data.code),
            eq(schema.projects.isActive, true),
          ),
        )
        .limit(1);

      if (duplicate) {
        throw new BadRequestException(`Project code "${data.code}" already exists`);
      }
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'code', 'clientName', 'description', 'startDate', 'endDate',
      'budgetHours', 'isBillable', 'billableRate', 'currency', 'status',
      'color', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    const [updated] = await this.db
      .update(schema.projects)
      .set(updates)
      .where(
        and(
          eq(schema.projects.id, id),
          eq(schema.projects.orgId, orgId),
        ),
      )
      .returning();

    return this.toProjectDto(updated);
  }

  async softDeleteProject(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, id),
          eq(schema.projects.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Project not found');

    await this.db
      .update(schema.projects)
      .set({ isActive: false, status: 'archived', updatedAt: new Date() })
      .where(
        and(
          eq(schema.projects.id, id),
          eq(schema.projects.orgId, orgId),
        ),
      );

    return { success: true, message: 'Project deactivated' };
  }

  // ────────────────────────────── Task Categories ──────────────────────────────

  async listCategories(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.taskCategories)
      .where(
        and(
          eq(schema.taskCategories.orgId, orgId),
          eq(schema.taskCategories.isActive, true),
        ),
      )
      .orderBy(schema.taskCategories.sortOrder);

    return rows.map((r) => this.toCategoryDto(r));
  }

  async createCategory(orgId: string, data: Record<string, any>) {
    if (!data.name) {
      throw new BadRequestException('name is required');
    }

    // Get next sort order
    const existingCategories = await this.db
      .select()
      .from(schema.taskCategories)
      .where(eq(schema.taskCategories.orgId, orgId));

    const maxOrder = existingCategories.reduce(
      (max, c) => Math.max(max, c.sortOrder ?? 0),
      0,
    );

    const [created] = await this.db
      .insert(schema.taskCategories)
      .values({
        orgId,
        name: data.name,
        code: data.code ?? null,
        type: data.type ?? 'general',
        isBillable: data.isBillable ?? false,
        color: data.color ?? '#6B7280',
        sortOrder: data.sortOrder ?? maxOrder + 1,
        metadata: data.metadata ?? {},
        isActive: true,
      })
      .returning();

    return this.toCategoryDto(created);
  }

  async updateCategory(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.taskCategories)
      .where(
        and(
          eq(schema.taskCategories.id, id),
          eq(schema.taskCategories.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Task category not found');

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'code', 'type', 'isBillable', 'color', 'sortOrder', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    const [updated] = await this.db
      .update(schema.taskCategories)
      .set(updates)
      .where(
        and(
          eq(schema.taskCategories.id, id),
          eq(schema.taskCategories.orgId, orgId),
        ),
      )
      .returning();

    return this.toCategoryDto(updated);
  }

  // ────────────────────────────── Project Assignments ──────────────────────────────

  async listAssignments(orgId: string, projectId: string) {
    // Verify project exists
    const [project] = await this.db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.orgId, orgId),
        ),
      )
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');

    const rows = await this.db
      .select({
        assignment: schema.projectAssignments,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
      })
      .from(schema.projectAssignments)
      .leftJoin(
        schema.users,
        and(
          eq(schema.projectAssignments.employeeId, schema.users.id),
          eq(schema.projectAssignments.orgId, schema.users.orgId),
        ),
      )
      .where(
        and(
          eq(schema.projectAssignments.orgId, orgId),
          eq(schema.projectAssignments.projectId, projectId),
          eq(schema.projectAssignments.isActive, true),
        ),
      )
      .orderBy(desc(schema.projectAssignments.createdAt));

    return rows.map((r) => ({
      ...this.toAssignmentDto(r.assignment),
      employee: {
        id: r.assignment.employeeId,
        firstName: r.employeeFirstName,
        lastName: r.employeeLastName,
        email: r.employeeEmail,
      },
    }));
  }

  async assignEmployee(orgId: string, projectId: string, data: Record<string, any>) {
    if (!data.employeeId) {
      throw new BadRequestException('employeeId is required');
    }

    // Verify project exists
    const [project] = await this.db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.orgId, orgId),
        ),
      )
      .limit(1);

    if (!project) throw new NotFoundException('Project not found');

    // Verify employee exists
    const [employee] = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, data.employeeId),
          eq(schema.users.orgId, orgId),
          eq(schema.users.isActive, true),
        ),
      )
      .limit(1);

    if (!employee) throw new NotFoundException('Employee not found');

    // Check for existing active assignment
    const [existingAssignment] = await this.db
      .select()
      .from(schema.projectAssignments)
      .where(
        and(
          eq(schema.projectAssignments.orgId, orgId),
          eq(schema.projectAssignments.projectId, projectId),
          eq(schema.projectAssignments.employeeId, data.employeeId),
          eq(schema.projectAssignments.isActive, true),
        ),
      )
      .limit(1);

    if (existingAssignment) {
      throw new BadRequestException('Employee is already assigned to this project');
    }

    const [created] = await this.db
      .insert(schema.projectAssignments)
      .values({
        orgId,
        projectId,
        employeeId: data.employeeId,
        role: data.role ?? null,
        allocationPercentage: data.allocationPercentage ?? '100',
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        isBillable: data.isBillable ?? project.isBillable,
        billableRate: data.billableRate ?? project.billableRate,
        metadata: data.metadata ?? {},
        isActive: true,
      })
      .returning();

    return this.toAssignmentDto(created);
  }

  async removeAssignment(orgId: string, projectId: string, assignmentId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.projectAssignments)
      .where(
        and(
          eq(schema.projectAssignments.id, assignmentId),
          eq(schema.projectAssignments.orgId, orgId),
          eq(schema.projectAssignments.projectId, projectId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Project assignment not found');

    await this.db
      .update(schema.projectAssignments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.projectAssignments.id, assignmentId),
          eq(schema.projectAssignments.orgId, orgId),
        ),
      );

    return { success: true, message: 'Assignment removed' };
  }

  // ────────────────────────────── DTOs ──────────────────────────────

  private toProjectDto(row: typeof schema.projects.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      code: row.code,
      clientName: row.clientName,
      description: row.description,
      startDate: row.startDate,
      endDate: row.endDate,
      budgetHours: row.budgetHours,
      isBillable: row.isBillable,
      billableRate: row.billableRate,
      currency: row.currency,
      status: row.status,
      color: row.color,
      metadata: row.metadata,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toCategoryDto(row: typeof schema.taskCategories.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      code: row.code,
      type: row.type,
      isBillable: row.isBillable,
      color: row.color,
      sortOrder: row.sortOrder,
      metadata: row.metadata,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAssignmentDto(row: typeof schema.projectAssignments.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      projectId: row.projectId,
      employeeId: row.employeeId,
      role: row.role,
      allocationPercentage: row.allocationPercentage,
      startDate: row.startDate,
      endDate: row.endDate,
      isBillable: row.isBillable,
      billableRate: row.billableRate,
      metadata: row.metadata,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
