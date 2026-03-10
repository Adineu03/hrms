import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class RoleGradeArchitectureService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listRoles(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)))
      .orderBy(desc(schema.roleGradeDefinitions.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createRole(
    orgId: string,
    dto: {
      roleTitle: string;
      jobFamily: string;
      jobFunction?: string;
      gradeCode: string;
      gradeLevel: number;
      salaryRangeMin?: number;
      salaryRangeMax?: number;
      salaryRangeMid?: number;
      currency?: string;
      roleDescription?: string;
      keyResponsibilities?: string[];
      competencyRequirements?: string[];
      typicalExperienceYears?: string;
      isManagerialRole?: boolean;
      reportingToGradeCode?: string;
      progressionPaths?: unknown;
    },
  ) {
    const [row] = await this.db
      .insert(schema.roleGradeDefinitions)
      .values({
        orgId,
        roleTitle: dto.roleTitle,
        jobFamily: dto.jobFamily,
        jobFunction: dto.jobFunction ?? null,
        gradeCode: dto.gradeCode,
        gradeLevel: dto.gradeLevel,
        salaryRangeMin: dto.salaryRangeMin !== undefined ? String(dto.salaryRangeMin) : null,
        salaryRangeMax: dto.salaryRangeMax !== undefined ? String(dto.salaryRangeMax) : null,
        salaryRangeMid: dto.salaryRangeMid !== undefined ? String(dto.salaryRangeMid) : null,
        currency: dto.currency ?? 'INR',
        roleDescription: dto.roleDescription ?? null,
        keyResponsibilities: dto.keyResponsibilities ?? null,
        competencyRequirements: dto.competencyRequirements ?? null,
        typicalExperienceYears: dto.typicalExperienceYears ?? null,
        isManagerialRole: dto.isManagerialRole ?? false,
        reportingToGradeCode: dto.reportingToGradeCode ?? null,
        progressionPaths: dto.progressionPaths ?? null,
      })
      .returning();

    return { data: row };
  }

  async getRole(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.id, id), eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)));

    if (!rows.length) throw new NotFoundException('Role grade definition not found');

    return { data: rows[0] };
  }

  async updateRole(
    orgId: string,
    id: string,
    dto: {
      roleTitle?: string;
      jobFamily?: string;
      jobFunction?: string;
      gradeCode?: string;
      gradeLevel?: number;
      salaryRangeMin?: number;
      salaryRangeMax?: number;
      salaryRangeMid?: number;
      currency?: string;
      roleDescription?: string;
      keyResponsibilities?: string[];
      competencyRequirements?: string[];
      typicalExperienceYears?: string;
      isManagerialRole?: boolean;
      reportingToGradeCode?: string;
      progressionPaths?: unknown;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.id, id), eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)));

    if (!existing.length) throw new NotFoundException('Role grade definition not found');

    const [row] = await this.db
      .update(schema.roleGradeDefinitions)
      .set({
        ...(dto.roleTitle !== undefined && { roleTitle: dto.roleTitle }),
        ...(dto.jobFamily !== undefined && { jobFamily: dto.jobFamily }),
        ...(dto.jobFunction !== undefined && { jobFunction: dto.jobFunction }),
        ...(dto.gradeCode !== undefined && { gradeCode: dto.gradeCode }),
        ...(dto.gradeLevel !== undefined && { gradeLevel: dto.gradeLevel }),
        ...(dto.salaryRangeMin !== undefined && { salaryRangeMin: String(dto.salaryRangeMin) }),
        ...(dto.salaryRangeMax !== undefined && { salaryRangeMax: String(dto.salaryRangeMax) }),
        ...(dto.salaryRangeMid !== undefined && { salaryRangeMid: String(dto.salaryRangeMid) }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.roleDescription !== undefined && { roleDescription: dto.roleDescription }),
        ...(dto.keyResponsibilities !== undefined && { keyResponsibilities: dto.keyResponsibilities }),
        ...(dto.competencyRequirements !== undefined && { competencyRequirements: dto.competencyRequirements }),
        ...(dto.typicalExperienceYears !== undefined && { typicalExperienceYears: dto.typicalExperienceYears }),
        ...(dto.isManagerialRole !== undefined && { isManagerialRole: dto.isManagerialRole }),
        ...(dto.reportingToGradeCode !== undefined && { reportingToGradeCode: dto.reportingToGradeCode }),
        ...(dto.progressionPaths !== undefined && { progressionPaths: dto.progressionPaths }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.roleGradeDefinitions.id, id), eq(schema.roleGradeDefinitions.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteRole(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.id, id), eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)));

    if (!existing.length) throw new NotFoundException('Role grade definition not found');

    const [row] = await this.db
      .update(schema.roleGradeDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.roleGradeDefinitions.id, id), eq(schema.roleGradeDefinitions.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getJobFamilies(orgId: string) {
    const rows = await this.db
      .select({ jobFamily: schema.roleGradeDefinitions.jobFamily })
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)));

    const families = [...new Set(rows.map((r) => r.jobFamily))].filter(Boolean);
    return { data: families, meta: { total: families.length } };
  }
}
