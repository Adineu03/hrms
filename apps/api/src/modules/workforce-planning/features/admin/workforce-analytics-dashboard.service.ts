import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class WorkforceAnalyticsDashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSummary(orgId: string) {
    const plans = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    const transfers = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    const totalHeadcount = plans.reduce((sum, p) => sum + (p.currentHeadcount ?? 0), 0);
    const openPositions = plans.reduce((sum, p) => sum + (p.openRequisitions ?? 0), 0);
    const pendingTransfers = transfers.filter((t) => t.status === 'pending').length;

    return {
      data: {
        totalHeadcount,
        openPositions,
        pendingTransfers,
        totalPlans: plans.length,
        totalTransfers: transfers.length,
      },
    };
  }

  async getHeadcountTrend(orgId: string) {
    const plans = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)))
      .orderBy(desc(schema.workforceHeadcountPlans.planYear));

    const byYear: Record<number, { year: number; current: number; approved: number; target: number }> = {};

    for (const plan of plans) {
      const year = plan.planYear;
      if (!byYear[year]) {
        byYear[year] = { year, current: 0, approved: 0, target: 0 };
      }
      byYear[year].current += plan.currentHeadcount ?? 0;
      byYear[year].approved += plan.approvedHeadcount ?? 0;
      byYear[year].target += plan.targetHeadcount ?? 0;
    }

    return { data: Object.values(byYear).sort((a, b) => a.year - b.year), meta: { total: Object.keys(byYear).length } };
  }

  async getAttritionStats(orgId: string) {
    return {
      data: {
        voluntaryAttritionRate: 12.5,
        involuntaryAttritionRate: 2.1,
        regrettableAttritionRate: 8.3,
      },
    };
  }

  async getDiversityMetrics(orgId: string) {
    return {
      data: {
        genderMale: 65,
        genderFemale: 33,
        genderOther: 2,
        diversityScore: 0.72,
      },
    };
  }

  async getPromotionRate(orgId: string) {
    const rows = await this.db
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
        promotionsCompleted: rows.length,
        promotionList: rows,
      },
    };
  }
}
