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
export class ShiftManagementService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.orgId, orgId), eq(schema.shifts.isActive, true)))
      .orderBy(desc(schema.shifts.createdAt));

    return rows.map((r) => this.toDto(r));
  }

  async getById(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.id, id), eq(schema.shifts.orgId, orgId)))
      .limit(1);

    if (!row) throw new NotFoundException('Shift not found');
    return this.toDto(row);
  }

  async create(orgId: string, data: Record<string, any>) {
    if (!data.name || !data.startTime || !data.endTime) {
      throw new BadRequestException('name, startTime, and endTime are required');
    }

    // If this shift is marked as default, unset other defaults
    if (data.isDefault) {
      await this.db
        .update(schema.shifts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(schema.shifts.orgId, orgId), eq(schema.shifts.isDefault, true)));
    }

    const [created] = await this.db
      .insert(schema.shifts)
      .values({
        orgId,
        name: data.name,
        code: data.code ?? null,
        type: data.type ?? 'general',
        startTime: data.startTime,
        endTime: data.endTime,
        graceMinutesLate: data.graceMinutesLate ?? 15,
        graceMinutesEarly: data.graceMinutesEarly ?? 15,
        isNightShift: data.isNightShift ?? false,
        isFlexible: data.isFlexible ?? false,
        flexCoreStart: data.flexCoreStart ?? null,
        flexCoreEnd: data.flexCoreEnd ?? null,
        minWorkHours: data.minWorkHours ?? 8,
        breakConfig: data.breakConfig ?? [],
        rotationPattern: data.rotationPattern ?? null,
        swapEnabled: data.swapEnabled ?? true,
        isDefault: data.isDefault ?? false,
        isActive: true,
      })
      .returning();

    return this.toDto(created);
  }

  async update(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.id, id), eq(schema.shifts.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Shift not found');

    // If setting as default, unset other defaults first
    if (data.isDefault === true) {
      await this.db
        .update(schema.shifts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.shifts.orgId, orgId),
            eq(schema.shifts.isDefault, true),
            sql`${schema.shifts.id} != ${id}`,
          ),
        );
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'code', 'type', 'startTime', 'endTime',
      'graceMinutesLate', 'graceMinutesEarly', 'isNightShift',
      'isFlexible', 'flexCoreStart', 'flexCoreEnd', 'minWorkHours',
      'breakConfig', 'rotationPattern', 'swapEnabled', 'isDefault',
      'nightAllowance', 'autoAssignRules', 'handoverRules',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    const [updated] = await this.db
      .update(schema.shifts)
      .set(updates)
      .where(and(eq(schema.shifts.id, id), eq(schema.shifts.orgId, orgId)))
      .returning();

    return this.toDto(updated);
  }

  async softDelete(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.id, id), eq(schema.shifts.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Shift not found');

    await this.db
      .update(schema.shifts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.shifts.id, id), eq(schema.shifts.orgId, orgId)));

    return { success: true, message: 'Shift deactivated' };
  }

  async assignToEmployees(
    orgId: string,
    shiftId: string,
    employeeIds: string[],
    effectiveFrom: string,
  ) {
    // Verify shift exists
    const [shift] = await this.db
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.id, shiftId), eq(schema.shifts.orgId, orgId)))
      .limit(1);

    if (!shift) throw new NotFoundException('Shift not found');

    if (!employeeIds || employeeIds.length === 0) {
      throw new BadRequestException('At least one employeeId is required');
    }

    const now = new Date();

    // Mark existing current assignments as not current for these employees
    for (const empId of employeeIds) {
      await this.db
        .update(schema.employeeShiftAssignments)
        .set({ isCurrent: false, effectiveTo: effectiveFrom, updatedAt: now })
        .where(
          and(
            eq(schema.employeeShiftAssignments.orgId, orgId),
            eq(schema.employeeShiftAssignments.employeeId, empId),
            eq(schema.employeeShiftAssignments.isCurrent, true),
          ),
        );
    }

    // Create new assignments
    const assignments = employeeIds.map((empId) => ({
      orgId,
      employeeId: empId,
      shiftId,
      effectiveFrom,
      isCurrent: true,
      metadata: {},
    }));

    const created = await this.db
      .insert(schema.employeeShiftAssignments)
      .values(assignments)
      .returning();

    return {
      success: true,
      assigned: created.length,
      shiftId,
      employeeIds,
      effectiveFrom,
    };
  }

  private toDto(row: typeof schema.shifts.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      code: row.code,
      type: row.type,
      startTime: row.startTime,
      endTime: row.endTime,
      graceMinutesLate: row.graceMinutesLate,
      graceMinutesEarly: row.graceMinutesEarly,
      isNightShift: row.isNightShift,
      isFlexible: row.isFlexible,
      flexCoreStart: row.flexCoreStart,
      flexCoreEnd: row.flexCoreEnd,
      minWorkHours: row.minWorkHours,
      breakConfig: row.breakConfig,
      rotationPattern: row.rotationPattern,
      nightAllowance: row.nightAllowance,
      autoAssignRules: row.autoAssignRules,
      swapEnabled: row.swapEnabled,
      handoverRules: row.handoverRules,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
