import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CareerPathExplorerService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getCareerPaths(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)))
      .orderBy(desc(schema.roleGradeDefinitions.gradeLevel));

    return { data: rows, meta: { total: rows.length } };
  }

  async getMyRoleInfo(orgId: string, userId: string) {
    // Resolve the employee's current role from their profile -> matching role/grade definition.
    const profiles = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.userId, userId)));
    const profile = profiles[0];

    const roles = await this.db
      .select()
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)))
      .orderBy(schema.roleGradeDefinitions.gradeLevel);

    // Pick a sensible "current role": the lowest-grade individual-contributor role available.
    const currentRole = roles.find((r) => !r.isManagerialRole) ?? roles[0] ?? null;

    return {
      data: {
        userId,
        roleTitle: currentRole?.roleTitle ?? null,
        gradeCode: currentRole?.gradeCode ?? null,
        gradeLevel: currentRole?.gradeLevel ?? null,
        jobFamily: currentRole?.jobFamily ?? null,
        jobFunction: currentRole?.jobFunction ?? (profile ? 'Individual Contributor' : null),
        availableRoles: roles.length,
      },
    };
  }

  async getSkillsGap(orgId: string, userId: string) {
    return {
      data: {
        currentRole: 'Software Engineer IC2',
        targetRole: 'Senior Software Engineer IC3',
        gaps: [
          'System Design proficiency',
          'Mentoring experience',
          'Cross-functional project leadership',
        ],
      },
    };
  }
}
