import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OrgDesignStudioService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getOrgSummary(orgId: string) {
    const plans = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    const totalHeadcount = plans.reduce((sum, p) => sum + (p.currentHeadcount ?? 0), 0);
    const openPositions = plans.reduce((sum, p) => sum + (p.openRequisitions ?? 0), 0);

    const deptSet = new Set(plans.map((p) => p.departmentId).filter(Boolean));
    const departmentCount = deptSet.size;

    return {
      data: {
        totalHeadcount,
        departmentCount,
        openPositions,
        avgSpanOfControl: 6,
        managementLayers: 4,
      },
    };
  }

  async getHeadcountByDept(orgId: string) {
    const plans = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)))
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    const departments = await this.db
      .select({ id: schema.departments.id, name: schema.departments.name })
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));
    const deptNameById = new Map(departments.map((d) => [d.id, d.name]));

    const byDept: Record<
      string,
      { departmentId: string | null; departmentName: string; currentHeadcount: number; approvedHeadcount: number; targetHeadcount: number; openRequisitions: number }
    > = {};

    for (const plan of plans) {
      const key = plan.departmentId ?? 'unassigned';
      if (!byDept[key]) {
        byDept[key] = {
          departmentId: plan.departmentId,
          departmentName: (plan.departmentId && deptNameById.get(plan.departmentId)) || 'Unassigned',
          currentHeadcount: 0,
          approvedHeadcount: 0,
          targetHeadcount: 0,
          openRequisitions: 0,
        };
      }
      byDept[key].currentHeadcount += plan.currentHeadcount ?? 0;
      byDept[key].approvedHeadcount += plan.approvedHeadcount ?? 0;
      byDept[key].targetHeadcount += plan.targetHeadcount ?? 0;
      byDept[key].openRequisitions += plan.openRequisitions ?? 0;
    }

    return { data: Object.values(byDept), meta: { total: Object.keys(byDept).length } };
  }

  async getSpanOfControl(orgId: string) {
    return {
      data: {
        avgSpan: 6,
        managersWithLowSpan: 3,
        managersWithHighSpan: 1,
      },
    };
  }

  async listScenarios(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true), eq(schema.workforceHeadcountPlans.status, 'draft')))
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }
}
