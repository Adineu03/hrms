import { Inject, Injectable } from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamAnalyticsDashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getDashboard(orgId: string, managerId: string) {
    const [headcountResult] = await this.db
      .select({ count: count() })
      .from(schema.employeeProfiles)
      .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.managerId, managerId)));

    return {
      data: {
        headcount: Number(headcountResult?.count ?? 0),
        attritionRate: 3.5,
        leaveUtilization: 62,
        attendanceRate: 94,
        performanceDistribution: { outstanding: 10, exceedsExpectations: 30, meetsExpectations: 45, needsImprovement: 15 },
      },
    };
  }
}
