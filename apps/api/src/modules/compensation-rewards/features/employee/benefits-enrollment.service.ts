import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class BenefitsEnrollmentService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listAvailablePlans(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.benefitPlans)
      .where(and(
        eq(schema.benefitPlans.orgId, orgId),
        eq(schema.benefitPlans.isActive, true),
      ))
      .orderBy(desc(schema.benefitPlans.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async listMyEnrollments(orgId: string, userId: string) {
    const enrollments = await this.db
      .select({
        enrollment: schema.benefitEnrollments,
        planName: schema.benefitPlans.name,
        planType: schema.benefitPlans.type,
        provider: schema.benefitPlans.provider,
        employerContribution: schema.benefitPlans.employerContribution,
        employerContributionType: schema.benefitPlans.employerContributionType,
        employeeContribution: schema.benefitPlans.employeeContribution,
        employeeContributionType: schema.benefitPlans.employeeContributionType,
        coverageDetails: schema.benefitPlans.coverageDetails,
      })
      .from(schema.benefitEnrollments)
      .leftJoin(schema.benefitPlans, eq(schema.benefitEnrollments.planId, schema.benefitPlans.id))
      .where(and(
        eq(schema.benefitEnrollments.orgId, orgId),
        eq(schema.benefitEnrollments.employeeId, userId),
      ))
      .orderBy(desc(schema.benefitEnrollments.createdAt));

    return {
      data: enrollments.map((e) => ({
        ...e.enrollment,
        planName: e.planName,
        planType: e.planType,
        provider: e.provider,
        employerContribution: e.employerContribution,
        employerContributionType: e.employerContributionType,
        employeeContribution: e.employeeContribution,
        employeeContributionType: e.employeeContributionType,
        coverageDetails: e.coverageDetails,
      })),
      meta: { total: enrollments.length },
    };
  }

  async enrollInPlan(orgId: string, userId: string, dto: {
    planId: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    dependents?: any[];
  }) {
    // Check if plan exists and is active
    const plans = await this.db
      .select()
      .from(schema.benefitPlans)
      .where(and(
        eq(schema.benefitPlans.id, dto.planId),
        eq(schema.benefitPlans.orgId, orgId),
        eq(schema.benefitPlans.isActive, true),
      ));

    if (!plans.length) throw new NotFoundException('Benefit plan not found');

    // Check if already enrolled
    const existing = await this.db
      .select()
      .from(schema.benefitEnrollments)
      .where(and(
        eq(schema.benefitEnrollments.orgId, orgId),
        eq(schema.benefitEnrollments.employeeId, userId),
        eq(schema.benefitEnrollments.planId, dto.planId),
        eq(schema.benefitEnrollments.status, 'active'),
      ));

    if (existing.length) throw new BadRequestException('Already enrolled in this plan');

    const [row] = await this.db
      .insert(schema.benefitEnrollments)
      .values({
        orgId,
        employeeId: userId,
        planId: dto.planId,
        status: 'active',
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        dependents: dto.dependents ?? [],
      })
      .returning();

    return { data: row };
  }

  async optOut(orgId: string, userId: string, enrollmentId: string) {
    const existing = await this.db
      .select()
      .from(schema.benefitEnrollments)
      .where(and(
        eq(schema.benefitEnrollments.id, enrollmentId),
        eq(schema.benefitEnrollments.orgId, orgId),
        eq(schema.benefitEnrollments.employeeId, userId),
        eq(schema.benefitEnrollments.status, 'active'),
      ));

    if (!existing.length) throw new NotFoundException('Enrollment not found');

    const [row] = await this.db
      .update(schema.benefitEnrollments)
      .set({
        status: 'cancelled',
        effectiveTo: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.benefitEnrollments.id, enrollmentId))
      .returning();

    return { data: row };
  }

  async listMyReimbursements(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(and(
        eq(schema.reimbursementClaims.orgId, orgId),
        eq(schema.reimbursementClaims.employeeId, userId),
        eq(schema.reimbursementClaims.isActive, true),
      ))
      .orderBy(desc(schema.reimbursementClaims.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async submitReimbursementClaim(orgId: string, userId: string, dto: {
    type: string;
    amount: string;
    description: string;
    receiptUrl?: string;
  }) {
    const [row] = await this.db
      .insert(schema.reimbursementClaims)
      .values({
        orgId,
        employeeId: userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        receiptUrl: dto.receiptUrl ?? null,
        status: 'pending',
        submittedAt: new Date(),
      })
      .returning();

    return { data: row };
  }
}
