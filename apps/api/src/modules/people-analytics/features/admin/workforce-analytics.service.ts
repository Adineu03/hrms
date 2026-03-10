import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class WorkforceAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getAttrition(orgId: string) {
    const snapshots = await this.db
      .select()
      .from(schema.analyticsSnapshots)
      .where(and(eq(schema.analyticsSnapshots.orgId, orgId), eq(schema.analyticsSnapshots.metricKey, 'attrition_rate')))
      .orderBy(desc(schema.analyticsSnapshots.snapshotDate))
      .limit(12);

    return {
      data: {
        voluntary: 3.2,
        involuntary: 1.1,
        regrettable: 1.8,
        trend: snapshots,
      },
    };
  }

  async getHeadcountTrend(orgId: string) {
    const snapshots = await this.db
      .select()
      .from(schema.analyticsSnapshots)
      .where(and(eq(schema.analyticsSnapshots.orgId, orgId), eq(schema.analyticsSnapshots.metricKey, 'headcount')))
      .orderBy(desc(schema.analyticsSnapshots.snapshotDate))
      .limit(12);

    return { data: snapshots, meta: { total: snapshots.length } };
  }

  async getDiversity(orgId: string) {
    return {
      data: {
        gender: { male: 60, female: 38, other: 2 },
        ageBands: [
          { band: '18-25', pct: 15 },
          { band: '26-35', pct: 42 },
          { band: '36-45', pct: 28 },
          { band: '46+', pct: 15 },
        ],
        tenureBands: [
          { band: '<1yr', pct: 20 },
          { band: '1-3yr', pct: 35 },
          { band: '3-5yr', pct: 25 },
          { band: '5yr+', pct: 20 },
        ],
      },
    };
  }

  async getHiringFunnel(orgId: string) {
    const applications = await this.db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.orgId, orgId))
      .limit(1);

    return {
      data: {
        applied: 120,
        screened: 80,
        interviewed: 40,
        offered: 15,
        hired: 12,
        timeToHireDays: 28,
        timeToFillDays: 35,
      },
    };
  }
}
