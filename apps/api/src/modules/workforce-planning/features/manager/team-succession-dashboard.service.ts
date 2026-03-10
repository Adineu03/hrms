import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamSuccessionDashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getTeamSuccession(orgId: string) {
    const plans = await this.db
      .select()
      .from(schema.successionPlans)
      .where(and(eq(schema.successionPlans.orgId, orgId), eq(schema.successionPlans.isActive, true)))
      .orderBy(desc(schema.successionPlans.createdAt));

    const plansWithCandidates = await Promise.all(
      plans.map(async (plan) => {
        const candidates = await this.db
          .select()
          .from(schema.successionCandidates)
          .where(
            and(
              eq(schema.successionCandidates.successionPlanId, plan.id),
              eq(schema.successionCandidates.orgId, orgId),
              eq(schema.successionCandidates.isActive, true),
            ),
          )
          .orderBy(desc(schema.successionCandidates.createdAt));

        return { ...plan, candidates };
      }),
    );

    return { data: plansWithCandidates, meta: { total: plansWithCandidates.length } };
  }

  async getBenchStrength(orgId: string) {
    const plans = await this.db
      .select()
      .from(schema.successionPlans)
      .where(and(eq(schema.successionPlans.orgId, orgId), eq(schema.successionPlans.isActive, true)));

    const totalPositions = plans.length;
    const strongBench = plans.filter((p) => p.benchStrength === 'strong').length;
    const adequateBench = plans.filter((p) => p.benchStrength === 'adequate').length;
    const weakBench = plans.filter((p) => p.benchStrength === 'weak').length;
    const noBench = plans.filter((p) => p.benchStrength === 'none').length;

    const criticalPositions = plans.filter((p) => p.criticalityLevel === 'critical').length;
    const avgCoverage = totalPositions > 0 ? Math.round(plans.reduce((sum, p) => sum + (p.successionCoveragePercent ?? 0), 0) / totalPositions) : 0;

    return {
      data: {
        totalPositions,
        strongBench,
        adequateBench,
        weakBench,
        noBench,
        criticalPositions,
        avgCoveragePercent: avgCoverage,
      },
    };
  }
}
