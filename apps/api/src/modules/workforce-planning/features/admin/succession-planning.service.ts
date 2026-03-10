import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SuccessionPlanningService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listSuccessionPlans(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.successionPlans)
      .where(and(eq(schema.successionPlans.orgId, orgId), eq(schema.successionPlans.isActive, true)))
      .orderBy(desc(schema.successionPlans.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createSuccessionPlan(
    orgId: string,
    dto: {
      positionTitle: string;
      departmentId?: string;
      currentHolderId?: string;
      criticalityLevel?: string;
      notes?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.successionPlans)
      .values({
        orgId,
        positionTitle: dto.positionTitle,
        departmentId: dto.departmentId ?? null,
        currentHolderId: dto.currentHolderId ?? null,
        criticalityLevel: dto.criticalityLevel ?? 'high',
        notes: dto.notes ?? null,
      })
      .returning();

    return { data: row };
  }

  async getSuccessionPlan(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.successionPlans)
      .where(and(eq(schema.successionPlans.id, id), eq(schema.successionPlans.orgId, orgId), eq(schema.successionPlans.isActive, true)));

    if (!rows.length) throw new NotFoundException('Succession plan not found');

    const candidates = await this.db
      .select()
      .from(schema.successionCandidates)
      .where(
        and(
          eq(schema.successionCandidates.successionPlanId, id),
          eq(schema.successionCandidates.orgId, orgId),
          eq(schema.successionCandidates.isActive, true),
        ),
      )
      .orderBy(desc(schema.successionCandidates.createdAt));

    return { data: { ...rows[0], candidates } };
  }

  async updateSuccessionPlan(
    orgId: string,
    id: string,
    dto: {
      positionTitle?: string;
      departmentId?: string;
      currentHolderId?: string;
      criticalityLevel?: string;
      notes?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.successionPlans)
      .where(and(eq(schema.successionPlans.id, id), eq(schema.successionPlans.orgId, orgId), eq(schema.successionPlans.isActive, true)));

    if (!existing.length) throw new NotFoundException('Succession plan not found');

    const [row] = await this.db
      .update(schema.successionPlans)
      .set({
        ...(dto.positionTitle !== undefined && { positionTitle: dto.positionTitle }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.currentHolderId !== undefined && { currentHolderId: dto.currentHolderId }),
        ...(dto.criticalityLevel !== undefined && { criticalityLevel: dto.criticalityLevel }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.successionPlans.id, id), eq(schema.successionPlans.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteSuccessionPlan(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.successionPlans)
      .where(and(eq(schema.successionPlans.id, id), eq(schema.successionPlans.orgId, orgId), eq(schema.successionPlans.isActive, true)));

    if (!existing.length) throw new NotFoundException('Succession plan not found');

    const [row] = await this.db
      .update(schema.successionPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.successionPlans.id, id), eq(schema.successionPlans.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async addCandidate(
    orgId: string,
    planId: string,
    dto: {
      candidateEmployeeId: string;
      readinessLevel: string;
      performanceRating?: string;
      potentialRating?: string;
      flightRisk?: string;
      developmentNotes?: string;
    },
  ) {
    const plan = await this.db
      .select()
      .from(schema.successionPlans)
      .where(and(eq(schema.successionPlans.id, planId), eq(schema.successionPlans.orgId, orgId), eq(schema.successionPlans.isActive, true)));

    if (!plan.length) throw new NotFoundException('Succession plan not found');

    const [row] = await this.db
      .insert(schema.successionCandidates)
      .values({
        orgId,
        successionPlanId: planId,
        candidateEmployeeId: dto.candidateEmployeeId,
        readinessLevel: dto.readinessLevel,
        performanceRating: dto.performanceRating ?? null,
        potentialRating: dto.potentialRating ?? null,
        flightRisk: dto.flightRisk ?? 'low',
        developmentNotes: dto.developmentNotes ?? null,
      })
      .returning();

    return { data: row };
  }

  async updateCandidate(
    orgId: string,
    planId: string,
    candidateId: string,
    dto: {
      readinessLevel?: string;
      performanceRating?: string;
      potentialRating?: string;
      flightRisk?: string;
      developmentNotes?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.successionCandidates)
      .where(
        and(
          eq(schema.successionCandidates.id, candidateId),
          eq(schema.successionCandidates.successionPlanId, planId),
          eq(schema.successionCandidates.orgId, orgId),
          eq(schema.successionCandidates.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Succession candidate not found');

    const [row] = await this.db
      .update(schema.successionCandidates)
      .set({
        ...(dto.readinessLevel !== undefined && { readinessLevel: dto.readinessLevel }),
        ...(dto.performanceRating !== undefined && { performanceRating: dto.performanceRating }),
        ...(dto.potentialRating !== undefined && { potentialRating: dto.potentialRating }),
        ...(dto.flightRisk !== undefined && { flightRisk: dto.flightRisk }),
        ...(dto.developmentNotes !== undefined && { developmentNotes: dto.developmentNotes }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.successionCandidates.id, candidateId), eq(schema.successionCandidates.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async removeCandidate(orgId: string, planId: string, candidateId: string) {
    const existing = await this.db
      .select()
      .from(schema.successionCandidates)
      .where(
        and(
          eq(schema.successionCandidates.id, candidateId),
          eq(schema.successionCandidates.successionPlanId, planId),
          eq(schema.successionCandidates.orgId, orgId),
          eq(schema.successionCandidates.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Succession candidate not found');

    const [row] = await this.db
      .update(schema.successionCandidates)
      .set({ status: 'removed', updatedAt: new Date() })
      .where(and(eq(schema.successionCandidates.id, candidateId), eq(schema.successionCandidates.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async approveCandidate(orgId: string, planId: string, candidateId: string) {
    const existing = await this.db
      .select()
      .from(schema.successionCandidates)
      .where(
        and(
          eq(schema.successionCandidates.id, candidateId),
          eq(schema.successionCandidates.successionPlanId, planId),
          eq(schema.successionCandidates.orgId, orgId),
          eq(schema.successionCandidates.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Succession candidate not found');

    const [row] = await this.db
      .update(schema.successionCandidates)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.successionCandidates.id, candidateId), eq(schema.successionCandidates.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
