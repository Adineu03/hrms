import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { benefitPlans, benefitEnrollments } from '../../../../infrastructure/database/schema/benefit-plans';

@Injectable()
export class AdminBenefitsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listPlans(orgId: string) {
    const rows = await this.db
      .select()
      .from(benefitPlans)
      .where(eq(benefitPlans.orgId, orgId))
      .orderBy(benefitPlans.name);

    return rows.map((r) => this.toPlanDto(r));
  }

  async getPlanById(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(benefitPlans)
      .where(and(eq(benefitPlans.id, id), eq(benefitPlans.orgId, orgId)))
      .limit(1);

    if (!row) throw new NotFoundException('Benefit plan not found');
    return this.toPlanDto(row);
  }

  async createPlan(orgId: string, data: {
    name: string;
    type: string;
    description?: string;
    provider?: string;
    eligibilityRules?: Record<string, any>;
    employerContribution?: string;
    employerContributionType?: string;
    employeeContribution?: string;
    employeeContributionType?: string;
    coverageDetails?: Record<string, any>;
    enrollmentStart?: string;
    enrollmentEnd?: string;
  }) {
    const now = new Date();
    const [inserted] = await this.db
      .insert(benefitPlans)
      .values({
        orgId,
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        provider: data.provider ?? null,
        isActive: true,
        eligibilityRules: data.eligibilityRules ?? {},
        employerContribution: data.employerContribution ?? null,
        employerContributionType: data.employerContributionType ?? 'fixed',
        employeeContribution: data.employeeContribution ?? null,
        employeeContributionType: data.employeeContributionType ?? 'fixed',
        coverageDetails: data.coverageDetails ?? {},
        enrollmentStart: data.enrollmentStart ? new Date(data.enrollmentStart) : null,
        enrollmentEnd: data.enrollmentEnd ? new Date(data.enrollmentEnd) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toPlanDto(inserted);
  }

  async updatePlan(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(benefitPlans)
      .where(and(eq(benefitPlans.id, id), eq(benefitPlans.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Benefit plan not found');

    const now = new Date();
    const updateValues: Record<string, any> = { updatedAt: now };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.type !== undefined) updateValues.type = data.type;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.provider !== undefined) updateValues.provider = data.provider;
    if (data.isActive !== undefined) updateValues.isActive = data.isActive;
    if (data.eligibilityRules !== undefined) updateValues.eligibilityRules = data.eligibilityRules;
    if (data.employerContribution !== undefined) updateValues.employerContribution = data.employerContribution;
    if (data.employerContributionType !== undefined) updateValues.employerContributionType = data.employerContributionType;
    if (data.employeeContribution !== undefined) updateValues.employeeContribution = data.employeeContribution;
    if (data.employeeContributionType !== undefined) updateValues.employeeContributionType = data.employeeContributionType;
    if (data.coverageDetails !== undefined) updateValues.coverageDetails = data.coverageDetails;
    if (data.enrollmentStart !== undefined) updateValues.enrollmentStart = data.enrollmentStart ? new Date(data.enrollmentStart) : null;
    if (data.enrollmentEnd !== undefined) updateValues.enrollmentEnd = data.enrollmentEnd ? new Date(data.enrollmentEnd) : null;

    const [updated] = await this.db
      .update(benefitPlans)
      .set(updateValues)
      .where(and(eq(benefitPlans.id, id), eq(benefitPlans.orgId, orgId)))
      .returning();

    return this.toPlanDto(updated);
  }

  async deactivatePlan(orgId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: benefitPlans.id })
      .from(benefitPlans)
      .where(and(eq(benefitPlans.id, id), eq(benefitPlans.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Benefit plan not found');

    const now = new Date();
    await this.db
      .update(benefitPlans)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(benefitPlans.id, id), eq(benefitPlans.orgId, orgId)));
  }

  async listEnrollments(orgId: string, planId?: string) {
    const conditions = [eq(benefitEnrollments.orgId, orgId)];
    if (planId) {
      conditions.push(eq(benefitEnrollments.planId, planId));
    }

    const rows = await this.db
      .select()
      .from(benefitEnrollments)
      .where(and(...conditions));

    return rows.map((r) => this.toEnrollmentDto(r));
  }

  async getEnrollmentsByEmployee(orgId: string, employeeId: string) {
    const rows = await this.db
      .select()
      .from(benefitEnrollments)
      .where(and(eq(benefitEnrollments.orgId, orgId), eq(benefitEnrollments.employeeId, employeeId)));

    return rows.map((r) => this.toEnrollmentDto(r));
  }

  private toPlanDto(row: typeof benefitPlans.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description ?? undefined,
      provider: row.provider ?? undefined,
      isActive: row.isActive,
      eligibilityRules: row.eligibilityRules ?? {},
      employerContribution: row.employerContribution ?? undefined,
      employerContributionType: row.employerContributionType ?? undefined,
      employeeContribution: row.employeeContribution ?? undefined,
      employeeContributionType: row.employeeContributionType ?? undefined,
      coverageDetails: row.coverageDetails ?? {},
      enrollmentStart: row.enrollmentStart?.toISOString() ?? undefined,
      enrollmentEnd: row.enrollmentEnd?.toISOString() ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toEnrollmentDto(row: typeof benefitEnrollments.$inferSelect) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      planId: row.planId,
      status: row.status,
      enrolledAt: row.enrolledAt?.toISOString() ?? undefined,
      effectiveFrom: row.effectiveFrom?.toISOString() ?? undefined,
      effectiveTo: row.effectiveTo?.toISOString() ?? undefined,
      dependents: row.dependents ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
