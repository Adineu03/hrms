import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { GradeData } from '@hrms/shared';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { grades } from '../../../../infrastructure/database/schema/grades';

@Injectable()
export class GradesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string): Promise<GradeData[]> {
    const rows = await this.db
      .select()
      .from(grades)
      .where(eq(grades.orgId, orgId))
      .orderBy(asc(grades.level));

    return rows.map((row) => this.toGradeData(row));
  }

  async create(orgId: string, data: GradeData): Promise<GradeData> {
    const now = new Date();
    const [inserted] = await this.db
      .insert(grades)
      .values({
        orgId,
        name: data.name,
        level: data.level,
        salaryBandMin:
          data.salaryBandMin != null ? String(data.salaryBandMin) : null,
        salaryBandMax:
          data.salaryBandMax != null ? String(data.salaryBandMax) : null,
        currency: data.currency ?? 'INR',
        description: data.description ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toGradeData(inserted);
  }

  async update(
    orgId: string,
    id: string,
    data: Partial<GradeData>,
  ): Promise<GradeData> {
    const [existing] = await this.db
      .select()
      .from(grades)
      .where(and(eq(grades.id, id), eq(grades.orgId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Grade not found');
    }

    const now = new Date();
    const updateValues: Record<string, any> = { updatedAt: now };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.level !== undefined) updateValues.level = data.level;
    if (data.salaryBandMin !== undefined)
      updateValues.salaryBandMin =
        data.salaryBandMin != null ? String(data.salaryBandMin) : null;
    if (data.salaryBandMax !== undefined)
      updateValues.salaryBandMax =
        data.salaryBandMax != null ? String(data.salaryBandMax) : null;
    if (data.currency !== undefined) updateValues.currency = data.currency;
    if (data.description !== undefined)
      updateValues.description = data.description;

    const [updated] = await this.db
      .update(grades)
      .set(updateValues)
      .where(and(eq(grades.id, id), eq(grades.orgId, orgId)))
      .returning();

    return this.toGradeData(updated);
  }

  async remove(orgId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(grades)
      .where(and(eq(grades.id, id), eq(grades.orgId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Grade not found');
    }

    await this.db
      .delete(grades)
      .where(and(eq(grades.id, id), eq(grades.orgId, orgId)));
  }

  async bulkCreate(
    orgId: string,
    dataList: GradeData[],
  ): Promise<GradeData[]> {
    if (dataList.length === 0) {
      return [];
    }

    const now = new Date();
    const rows = dataList.map((data) => ({
      orgId,
      name: data.name,
      level: data.level,
      salaryBandMin:
        data.salaryBandMin != null ? String(data.salaryBandMin) : null,
      salaryBandMax:
        data.salaryBandMax != null ? String(data.salaryBandMax) : null,
      currency: data.currency ?? 'INR',
      description: data.description ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const inserted = await this.db
      .insert(grades)
      .values(rows)
      .returning();

    return inserted.map((row) => this.toGradeData(row));
  }

  private toGradeData(row: typeof grades.$inferSelect): GradeData {
    return {
      id: row.id,
      name: row.name,
      level: row.level,
      salaryBandMin:
        row.salaryBandMin != null ? Number(row.salaryBandMin) : undefined,
      salaryBandMax:
        row.salaryBandMax != null ? Number(row.salaryBandMax) : undefined,
      currency: row.currency ?? undefined,
      description: row.description ?? undefined,
    };
  }
}
