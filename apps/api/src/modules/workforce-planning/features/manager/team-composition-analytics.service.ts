import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamCompositionAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getTeamComposition(orgId: string) {
    const transfers = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(
        and(
          eq(schema.internalTransferRequests.orgId, orgId),
          eq(schema.internalTransferRequests.isActive, true),
          eq(schema.internalTransferRequests.requestType, 'promotion'),
          eq(schema.internalTransferRequests.status, 'completed'),
        ),
      );

    return {
      data: {
        gradeDistribution: [],
        tenureDistribution: [],
        promotionsThisCycle: transfers.length,
      },
    };
  }

  async getGradeDistribution(orgId: string) {
    const roles = await this.db
      .select({
        gradeCode: schema.roleGradeDefinitions.gradeCode,
        gradeLevel: schema.roleGradeDefinitions.gradeLevel,
        jobFamily: schema.roleGradeDefinitions.jobFamily,
      })
      .from(schema.roleGradeDefinitions)
      .where(and(eq(schema.roleGradeDefinitions.orgId, orgId), eq(schema.roleGradeDefinitions.isActive, true)))
      .orderBy(desc(schema.roleGradeDefinitions.gradeLevel));

    const distribution: Record<string, { gradeCode: string; gradeLevel: number; count: number }> = {};

    for (const role of roles) {
      const key = role.gradeCode;
      if (!distribution[key]) {
        distribution[key] = { gradeCode: role.gradeCode, gradeLevel: role.gradeLevel, count: 0 };
      }
      distribution[key].count += 1;
    }

    return { data: Object.values(distribution), meta: { total: Object.keys(distribution).length } };
  }
}
