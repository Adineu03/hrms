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
    // Return available role grade definitions for the employee's context
    const rows = await this.db
      .select()
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)))
      .orderBy(desc(schema.roleGradeDefinitions.gradeLevel));

    return {
      data: {
        userId,
        availableRoles: rows.length,
        roles: rows.slice(0, 5),
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
