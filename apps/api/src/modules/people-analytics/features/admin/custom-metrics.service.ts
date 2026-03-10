import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CustomMetricsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getKpis(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.analyticsKpis)
      .where(and(eq(schema.analyticsKpis.orgId, orgId), eq(schema.analyticsKpis.isActive, true)))
      .orderBy(desc(schema.analyticsKpis.createdAt));
    return { data: rows, meta: { total: rows.length } };
  }

  async createKpi(orgId: string, body: Record<string, unknown>) {
    const [row] = await this.db
      .insert(schema.analyticsKpis)
      .values({
        orgId,
        name: String(body.name ?? ''),
        formula: String(body.formula ?? ''),
        description: body.description ? String(body.description) : null,
        unit: body.unit ? String(body.unit) : null,
        targetValue: body.targetValue ? Number(body.targetValue) : null,
        thresholdLow: body.thresholdLow ? Number(body.thresholdLow) : null,
        thresholdHigh: body.thresholdHigh ? Number(body.thresholdHigh) : null,
        alertEnabled: Boolean(body.alertEnabled ?? false),
        scope: String(body.scope ?? 'org'),
      })
      .returning();
    return { data: row };
  }

  async deleteKpi(orgId: string, id: string) {
    await this.db
      .update(schema.analyticsKpis)
      .set({ isActive: false })
      .where(and(eq(schema.analyticsKpis.id, id), eq(schema.analyticsKpis.orgId, orgId)));
    return { data: { success: true } };
  }
}
