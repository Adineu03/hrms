import { Inject, Injectable } from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm'; // and used in pinMetric
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class HrDashboardsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getKpis(orgId: string) {
    const [headcountResult] = await this.db
      .select({ count: count() })
      .from(schema.employeeProfiles)
      .where(eq(schema.employeeProfiles.orgId, orgId));

    return {
      data: {
        headcount: Number(headcountResult?.count ?? 0),
        attritionRate: 4.2,
        openRoles: 8,
        avgTenureMonths: 24,
        departments: [],
      },
    };
  }

  async pinMetric(orgId: string, body: Record<string, unknown>) {
    const existing = await this.db
      .select()
      .from(schema.analyticsDashboards)
      .where(and(eq(schema.analyticsDashboards.orgId, orgId), eq(schema.analyticsDashboards.isDefault, true)))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const widgets = (current.widgets as { metricKey: string; label: string; position: number }[]) ?? [];
      widgets.push({ metricKey: String(body.metricKey ?? ''), label: String(body.label ?? ''), position: widgets.length + 1 });
      await this.db
        .update(schema.analyticsDashboards)
        .set({ widgets })
        .where(eq(schema.analyticsDashboards.id, current.id));
    } else {
      await this.db.insert(schema.analyticsDashboards).values({
        orgId,
        name: 'Default Dashboard',
        dashboardType: 'org',
        widgets: [{ metricKey: String(body.metricKey ?? ''), label: String(body.label ?? ''), position: 1 }],
        isDefault: true,
      });
    }
    return { data: { success: true } };
  }
}
