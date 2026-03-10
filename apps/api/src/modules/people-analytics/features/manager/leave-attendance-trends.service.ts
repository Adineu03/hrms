import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveAttendanceTrendsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getTrends(orgId: string, managerId: string) {
    const snapshots = await this.db
      .select()
      .from(schema.analyticsSnapshots)
      .where(and(eq(schema.analyticsSnapshots.orgId, orgId), eq(schema.analyticsSnapshots.metricKey, 'attendance_rate')))
      .orderBy(desc(schema.analyticsSnapshots.snapshotDate))
      .limit(6);

    return {
      data: {
        absenceTrend: snapshots,
        leaveTypeBreakdown: [
          { type: 'casual', days: 45 },
          { type: 'sick', days: 22 },
          { type: 'earned', days: 18 },
        ],
        attendanceRateVsOrg: { team: 94, org: 91 },
        unplannedAbsences: 3,
      },
    };
  }
}
