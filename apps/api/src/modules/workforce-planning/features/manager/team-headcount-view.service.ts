import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, gt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { isScenarioRow } from '../../scenario.util';

@Injectable()
export class TeamHeadcountViewService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getTeamHeadcount(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)))
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    // Org Design Studio scenarios share this table (metadata.type === 'scenario') — exclude them.
    const plans = rows.filter((r) => !isScenarioRow(r));

    return { data: plans, meta: { total: plans.length } };
  }

  async getOpenPositions(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true), gt(schema.workforceHeadcountPlans.openRequisitions, 0)))
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }
}
