import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyCompensationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getCurrentCtcBreakdown(orgId: string, userId: string) {
    // Get current salary assignment
    const assignments = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(and(
        eq(schema.employeeSalaryAssignments.orgId, orgId),
        eq(schema.employeeSalaryAssignments.employeeId, userId),
      ))
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
      .limit(1);

    if (!assignments.length) {
      return { data: null };
    }

    const assignment = assignments[0];

    // Get salary structure
    let salaryStructure = null;
    if (assignment.salaryStructureId) {
      const structures = await this.db
        .select()
        .from(schema.salaryStructures)
        .where(eq(schema.salaryStructures.id, assignment.salaryStructureId));
      salaryStructure = structures[0] ?? null;
    }

    return {
      data: {
        ctc: assignment.ctc,
        basicSalary: assignment.basicSalary,
        effectiveFrom: assignment.effectiveFrom,
        salaryStructure: salaryStructure ? {
          name: salaryStructure.name,
          components: salaryStructure.components,
        } : null,
        componentOverrides: assignment.componentOverrides,
      },
    };
  }

  async getCompensationHistory(orgId: string, userId: string) {
    const history = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(and(
        eq(schema.employeeSalaryAssignments.orgId, orgId),
        eq(schema.employeeSalaryAssignments.employeeId, userId),
      ))
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom));

    return {
      data: history.map((h) => ({
        id: h.id,
        ctc: h.ctc,
        basicSalary: h.basicSalary,
        effectiveFrom: h.effectiveFrom,
        effectiveTo: h.effectiveTo,
        createdAt: h.createdAt,
      })),
      meta: { total: history.length },
    };
  }

  async getTotalRewardsView(orgId: string, userId: string) {
    // Current salary
    const assignments = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(and(
        eq(schema.employeeSalaryAssignments.orgId, orgId),
        eq(schema.employeeSalaryAssignments.employeeId, userId),
      ))
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
      .limit(1);

    // Benefits enrolled
    const enrollments = await this.db
      .select({
        enrollment: schema.benefitEnrollments,
        planName: schema.benefitPlans.name,
        planType: schema.benefitPlans.type,
        employerContribution: schema.benefitPlans.employerContribution,
      })
      .from(schema.benefitEnrollments)
      .leftJoin(schema.benefitPlans, eq(schema.benefitEnrollments.planId, schema.benefitPlans.id))
      .where(and(
        eq(schema.benefitEnrollments.orgId, orgId),
        eq(schema.benefitEnrollments.employeeId, userId),
        eq(schema.benefitEnrollments.status, 'active'),
      ));

    // Recognition points
    const pointsAccounts = await this.db
      .select()
      .from(schema.recognitionPoints)
      .where(and(
        eq(schema.recognitionPoints.orgId, orgId),
        eq(schema.recognitionPoints.employeeId, userId),
      ));

    return {
      data: {
        salary: {
          currentCtc: assignments[0]?.ctc ?? '0',
          basicSalary: assignments[0]?.basicSalary ?? '0',
        },
        benefits: enrollments.map((e) => ({
          planName: e.planName,
          planType: e.planType,
          employerContribution: e.employerContribution,
          status: e.enrollment.status,
        })),
        recognition: {
          totalPointsEarned: pointsAccounts[0]?.totalEarned ?? 0,
          totalPointsRedeemed: pointsAccounts[0]?.totalRedeemed ?? 0,
          pointsBalance: pointsAccounts[0]?.balance ?? 0,
        },
      },
    };
  }
}
