import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class HeadcountPlanningService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listPlans(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)))
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createPlan(
    orgId: string,
    dto: {
      planName: string;
      planYear: number;
      departmentId?: string;
      locationId?: string;
      gradeId?: string;
      entityId?: string;
      currentHeadcount: number;
      approvedHeadcount: number;
      targetHeadcount: number;
      openRequisitions?: number;
      hiringFreezeActive?: boolean;
      hiringFreezeReason?: string;
      notes?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.workforceHeadcountPlans)
      .values({
        orgId,
        planName: dto.planName,
        planYear: dto.planYear,
        departmentId: dto.departmentId ?? null,
        locationId: dto.locationId ?? null,
        gradeId: dto.gradeId ?? null,
        entityId: dto.entityId ?? null,
        currentHeadcount: dto.currentHeadcount,
        approvedHeadcount: dto.approvedHeadcount,
        targetHeadcount: dto.targetHeadcount,
        openRequisitions: dto.openRequisitions ?? 0,
        hiringFreezeActive: dto.hiringFreezeActive ?? false,
        hiringFreezeReason: dto.hiringFreezeReason ?? null,
        notes: dto.notes ?? null,
      })
      .returning();

    return { data: row };
  }

  async getPlan(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    if (!rows.length) throw new NotFoundException('Headcount plan not found');

    return { data: rows[0] };
  }

  async updatePlan(
    orgId: string,
    id: string,
    dto: {
      planName?: string;
      planYear?: number;
      departmentId?: string;
      locationId?: string;
      gradeId?: string;
      entityId?: string;
      currentHeadcount?: number;
      approvedHeadcount?: number;
      targetHeadcount?: number;
      openRequisitions?: number;
      hiringFreezeActive?: boolean;
      hiringFreezeReason?: string;
      notes?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    if (!existing.length) throw new NotFoundException('Headcount plan not found');

    const [row] = await this.db
      .update(schema.workforceHeadcountPlans)
      .set({
        ...(dto.planName !== undefined && { planName: dto.planName }),
        ...(dto.planYear !== undefined && { planYear: dto.planYear }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId }),
        ...(dto.gradeId !== undefined && { gradeId: dto.gradeId }),
        ...(dto.entityId !== undefined && { entityId: dto.entityId }),
        ...(dto.currentHeadcount !== undefined && { currentHeadcount: dto.currentHeadcount }),
        ...(dto.approvedHeadcount !== undefined && { approvedHeadcount: dto.approvedHeadcount }),
        ...(dto.targetHeadcount !== undefined && { targetHeadcount: dto.targetHeadcount }),
        ...(dto.openRequisitions !== undefined && { openRequisitions: dto.openRequisitions }),
        ...(dto.hiringFreezeActive !== undefined && { hiringFreezeActive: dto.hiringFreezeActive }),
        ...(dto.hiringFreezeReason !== undefined && { hiringFreezeReason: dto.hiringFreezeReason }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deletePlan(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    if (!existing.length) throw new NotFoundException('Headcount plan not found');

    const [row] = await this.db
      .update(schema.workforceHeadcountPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async approvePlan(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    if (!existing.length) throw new NotFoundException('Headcount plan not found');

    const [row] = await this.db
      .update(schema.workforceHeadcountPlans)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async toggleFreeze(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    if (!existing.length) throw new NotFoundException('Headcount plan not found');

    const current = existing[0];
    const [row] = await this.db
      .update(schema.workforceHeadcountPlans)
      .set({ hiringFreezeActive: !current.hiringFreezeActive, updatedAt: new Date() })
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
