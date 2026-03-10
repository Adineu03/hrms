import { Inject, Injectable } from '@nestjs/common';
import { eq, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PerformanceInsightsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getInsights(orgId: string, managerId: string) {
    const [goalCount] = await this.db
      .select({ count: count() })
      .from(schema.goals)
      .where(eq(schema.goals.orgId, orgId));

    return {
      data: {
        goalCompletionRate: 71,
        reviewCycleCompletion: 88,
        avgPerformanceScore: 3.4,
        topPerformers: [],
        skillGapSummary: [],
        totalGoals: Number(goalCount?.count ?? 0),
      },
    };
  }
}
