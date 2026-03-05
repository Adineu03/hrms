import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import {
  benefitPlans,
  benefitEnrollments,
} from '../../../../infrastructure/database/schema/benefit-plans';

@Injectable()
export class EmployeeBenefitsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getAvailablePlans(orgId: string, _userId: string) {
    // Return all active benefit plans for this org
    // Future: add eligibility checks based on grade, tenure, employment type
    const plans = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.orgId, orgId),
          eq(benefitPlans.isActive, true),
        ),
      );

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        description: plan.description,
        provider: plan.provider,
        employerContribution: plan.employerContribution,
        employerContributionType: plan.employerContributionType,
        employeeContribution: plan.employeeContribution,
        employeeContributionType: plan.employeeContributionType,
        coverageDetails: plan.coverageDetails,
        enrollmentStart: plan.enrollmentStart,
        enrollmentEnd: plan.enrollmentEnd,
      })),
      total: plans.length,
    };
  }

  async getPlanDetail(orgId: string, planId: string) {
    const [plan] = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, planId),
          eq(benefitPlans.orgId, orgId),
        ),
      )
      .limit(1);

    if (!plan) {
      throw new NotFoundException('Benefit plan not found');
    }

    return {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      description: plan.description,
      provider: plan.provider,
      isActive: plan.isActive,
      eligibilityRules: plan.eligibilityRules,
      employerContribution: plan.employerContribution,
      employerContributionType: plan.employerContributionType,
      employeeContribution: plan.employeeContribution,
      employeeContributionType: plan.employeeContributionType,
      coverageDetails: plan.coverageDetails,
      enrollmentStart: plan.enrollmentStart,
      enrollmentEnd: plan.enrollmentEnd,
    };
  }

  async getMyEnrollments(orgId: string, userId: string) {
    const enrollments = await this.db
      .select()
      .from(benefitEnrollments)
      .where(
        and(
          eq(benefitEnrollments.orgId, orgId),
          eq(benefitEnrollments.employeeId, userId),
        ),
      );

    // Enrich with plan details
    const enriched = [];
    for (const enrollment of enrollments) {
      const [plan] = await this.db
        .select({
          name: benefitPlans.name,
          type: benefitPlans.type,
          provider: benefitPlans.provider,
        })
        .from(benefitPlans)
        .where(eq(benefitPlans.id, enrollment.planId))
        .limit(1);

      enriched.push({
        id: enrollment.id,
        planId: enrollment.planId,
        planName: plan?.name ?? null,
        planType: plan?.type ?? null,
        provider: plan?.provider ?? null,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        effectiveFrom: enrollment.effectiveFrom,
        effectiveTo: enrollment.effectiveTo,
        dependents: enrollment.dependents,
      });
    }

    return { enrollments: enriched, total: enriched.length };
  }

  async enroll(
    orgId: string,
    userId: string,
    data: { planId: string; dependents?: any[] },
  ) {
    // Verify plan exists and is active
    const [plan] = await this.db
      .select()
      .from(benefitPlans)
      .where(
        and(
          eq(benefitPlans.id, data.planId),
          eq(benefitPlans.orgId, orgId),
          eq(benefitPlans.isActive, true),
        ),
      )
      .limit(1);

    if (!plan) {
      throw new NotFoundException('Benefit plan not found or inactive');
    }

    // Check if already enrolled in this plan
    const [existingEnrollment] = await this.db
      .select()
      .from(benefitEnrollments)
      .where(
        and(
          eq(benefitEnrollments.orgId, orgId),
          eq(benefitEnrollments.employeeId, userId),
          eq(benefitEnrollments.planId, data.planId),
          eq(benefitEnrollments.status, 'active'),
        ),
      )
      .limit(1);

    if (existingEnrollment) {
      return {
        message: 'Already enrolled in this plan',
        enrollment: existingEnrollment,
      };
    }

    const now = new Date();
    const [enrollment] = await this.db
      .insert(benefitEnrollments)
      .values({
        orgId,
        employeeId: userId,
        planId: data.planId,
        status: 'active',
        enrolledAt: now,
        effectiveFrom: now,
        dependents: data.dependents ?? [],
      })
      .returning();

    return {
      message: 'Successfully enrolled in benefit plan',
      enrollment: {
        id: enrollment.id,
        planId: enrollment.planId,
        planName: plan.name,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        dependents: enrollment.dependents,
      },
    };
  }
}
