import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { isScenarioRow, type ScenarioMetadata } from '../../scenario.util';

@Injectable()
export class OrgDesignStudioService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getOrgSummary(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    // Planning scenarios are stored in the same table — keep them out of real headcount totals.
    const plans = rows.filter((p) => !isScenarioRow(p));

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
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)))
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    // Planning scenarios are stored in the same table — keep them out of dept headcount rows.
    const plans = rows.filter((p) => !isScenarioRow(p));

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
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)))
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    // Scenarios live in workforce_headcount_plans tagged metadata.type === 'scenario'
    // (no dedicated planning-scenarios table exists). Map rows to the exact shape
    // the Org Design Studio tab renders — always arrays, numerics via Number()||0.
    const scenarios = rows.filter(isScenarioRow).map((row) => {
      const meta = (row.metadata ?? {}) as ScenarioMetadata;
      const impact = meta.impact ?? {};
      const rawUnits = Array.isArray(meta.orgStructure?.units) ? meta.orgStructure.units : [];

      return {
        id: row.id,
        scenarioName: row.planName,
        description: meta.description ?? row.notes ?? '',
        status: row.status,
        planYear: row.planYear,
        assumptions: Array.isArray(meta.assumptions) ? (meta.assumptions as unknown[]).map(String) : [],
        impact: {
          headcountDelta: Number(impact.headcountDelta) || 0,
          costImpactAnnual: Number(impact.costImpactAnnual) || 0,
          costImpactLabel:
            typeof impact.costImpactLabel === 'string' && impact.costImpactLabel.length > 0
              ? impact.costImpactLabel
              : 'Cost neutral',
        },
        orgStructure: {
          units: rawUnits.map((u) => ({
            name: String(u?.name ?? ''),
            headcount: Number(u?.headcount) || 0,
            change: String(u?.change ?? '±0'),
          })),
        },
        createdAt: row.createdAt,
      };
    });

    return { data: scenarios, meta: { total: scenarios.length } };
  }
}
