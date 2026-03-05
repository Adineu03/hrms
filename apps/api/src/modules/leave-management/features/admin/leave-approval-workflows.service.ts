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
export class LeaveApprovalWorkflowsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.leaveApprovalWorkflows)
      .where(
        and(
          eq(schema.leaveApprovalWorkflows.orgId, orgId),
          eq(schema.leaveApprovalWorkflows.isActive, true),
        ),
      )
      .orderBy(desc(schema.leaveApprovalWorkflows.createdAt));

    return rows.map((r) => this.toDto(r));
  }

  async getById(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.leaveApprovalWorkflows)
      .where(
        and(
          eq(schema.leaveApprovalWorkflows.id, id),
          eq(schema.leaveApprovalWorkflows.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Leave approval workflow not found');
    return this.toDto(row);
  }

  async create(orgId: string, data: Record<string, any>) {
    if (!data.name) {
      throw new BadRequestException('name is required');
    }

    // Validate levels structure
    const levels = data.levels ?? [];
    if (!Array.isArray(levels)) {
      throw new BadRequestException('levels must be an array');
    }

    // If this workflow is marked as default, unset other defaults
    if (data.isDefault) {
      await this.db
        .update(schema.leaveApprovalWorkflows)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.leaveApprovalWorkflows.orgId, orgId),
            eq(schema.leaveApprovalWorkflows.isDefault, true),
          ),
        );
    }

    const [created] = await this.db
      .insert(schema.leaveApprovalWorkflows)
      .values({
        orgId,
        name: data.name,
        levels: data.levels ?? [],
        applicableLeaveTypes: data.applicableLeaveTypes ?? [],
        applicableDepartments: data.applicableDepartments ?? [],
        minDaysForMultiLevel: data.minDaysForMultiLevel ?? 3,
        isDefault: data.isDefault ?? false,
        isActive: true,
      })
      .returning();

    return this.toDto(created);
  }

  async update(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.leaveApprovalWorkflows)
      .where(
        and(
          eq(schema.leaveApprovalWorkflows.id, id),
          eq(schema.leaveApprovalWorkflows.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Leave approval workflow not found');

    // If setting as default, unset other defaults first
    if (data.isDefault === true) {
      await this.db
        .update(schema.leaveApprovalWorkflows)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.leaveApprovalWorkflows.orgId, orgId),
            eq(schema.leaveApprovalWorkflows.isDefault, true),
          ),
        );
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'levels', 'applicableLeaveTypes', 'applicableDepartments',
      'minDaysForMultiLevel', 'isDefault',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    const [updated] = await this.db
      .update(schema.leaveApprovalWorkflows)
      .set(updates)
      .where(
        and(
          eq(schema.leaveApprovalWorkflows.id, id),
          eq(schema.leaveApprovalWorkflows.orgId, orgId),
        ),
      )
      .returning();

    return this.toDto(updated);
  }

  async softDelete(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.leaveApprovalWorkflows)
      .where(
        and(
          eq(schema.leaveApprovalWorkflows.id, id),
          eq(schema.leaveApprovalWorkflows.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Leave approval workflow not found');

    await this.db
      .update(schema.leaveApprovalWorkflows)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.leaveApprovalWorkflows.id, id),
          eq(schema.leaveApprovalWorkflows.orgId, orgId),
        ),
      );

    return { success: true, message: 'Leave approval workflow deactivated' };
  }

  private toDto(row: typeof schema.leaveApprovalWorkflows.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      levels: row.levels,
      applicableLeaveTypes: row.applicableLeaveTypes,
      applicableDepartments: row.applicableDepartments,
      minDaysForMultiLevel: row.minDaysForMultiLevel,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
