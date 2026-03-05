import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { salaryStructures, employeeSalaryAssignments } from '../../../../infrastructure/database/schema/salary-structures';

@Injectable()
export class SalaryStructuresService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string) {
    const rows = await this.db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.orgId, orgId))
      .orderBy(salaryStructures.name);

    return rows.map((r) => this.toDto(r));
  }

  async getById(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(salaryStructures)
      .where(and(eq(salaryStructures.id, id), eq(salaryStructures.orgId, orgId)))
      .limit(1);

    if (!row) throw new NotFoundException('Salary structure not found');
    return this.toDto(row);
  }

  async create(orgId: string, data: {
    name: string;
    description?: string;
    components?: any[];
  }) {
    const now = new Date();
    const [inserted] = await this.db
      .insert(salaryStructures)
      .values({
        orgId,
        name: data.name,
        description: data.description ?? null,
        components: data.components ?? [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toDto(inserted);
  }

  async update(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(salaryStructures)
      .where(and(eq(salaryStructures.id, id), eq(salaryStructures.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Salary structure not found');

    const now = new Date();
    const updateValues: Record<string, any> = { updatedAt: now };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.components !== undefined) updateValues.components = data.components;
    if (data.isActive !== undefined) updateValues.isActive = data.isActive;

    const [updated] = await this.db
      .update(salaryStructures)
      .set(updateValues)
      .where(and(eq(salaryStructures.id, id), eq(salaryStructures.orgId, orgId)))
      .returning();

    return this.toDto(updated);
  }

  async deactivate(orgId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: salaryStructures.id })
      .from(salaryStructures)
      .where(and(eq(salaryStructures.id, id), eq(salaryStructures.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Salary structure not found');

    const now = new Date();
    await this.db
      .update(salaryStructures)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(salaryStructures.id, id), eq(salaryStructures.orgId, orgId)));
  }

  async assign(orgId: string, data: {
    employeeId: string;
    salaryStructureId: string;
    ctc?: string;
    basicSalary?: string;
    effectiveFrom: string;
  }) {
    // Verify salary structure exists
    const [structure] = await this.db
      .select({ id: salaryStructures.id })
      .from(salaryStructures)
      .where(and(eq(salaryStructures.id, data.salaryStructureId), eq(salaryStructures.orgId, orgId)))
      .limit(1);

    if (!structure) throw new NotFoundException('Salary structure not found');

    const now = new Date();
    const [inserted] = await this.db
      .insert(employeeSalaryAssignments)
      .values({
        orgId,
        employeeId: data.employeeId,
        salaryStructureId: data.salaryStructureId,
        ctc: data.ctc ?? null,
        basicSalary: data.basicSalary ?? null,
        effectiveFrom: new Date(data.effectiveFrom),
        componentOverrides: {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toAssignmentDto(inserted);
  }

  async getAssignments(orgId: string, employeeId: string) {
    const rows = await this.db
      .select()
      .from(employeeSalaryAssignments)
      .where(and(eq(employeeSalaryAssignments.orgId, orgId), eq(employeeSalaryAssignments.employeeId, employeeId)))
      .orderBy(desc(employeeSalaryAssignments.effectiveFrom));

    return rows.map((r) => this.toAssignmentDto(r));
  }

  private toDto(row: typeof salaryStructures.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      isActive: row.isActive,
      components: row.components ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAssignmentDto(row: typeof employeeSalaryAssignments.$inferSelect) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      salaryStructureId: row.salaryStructureId,
      ctc: row.ctc ?? undefined,
      basicSalary: row.basicSalary ?? undefined,
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: row.effectiveTo?.toISOString() ?? undefined,
      componentOverrides: row.componentOverrides ?? {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
