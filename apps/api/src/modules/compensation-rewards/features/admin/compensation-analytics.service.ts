import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CompensationAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPayEquityAnalysis(orgId: string) {
    // Get salary assignments with employee profile data grouped by department and designation
    const assignments = await this.db
      .select({
        departmentId: schema.employeeProfiles.departmentId,
        designationId: schema.employeeProfiles.designationId,
        gender: schema.employeeProfiles.gender,
        ctc: schema.employeeSalaryAssignments.ctc,
        basicSalary: schema.employeeSalaryAssignments.basicSalary,
      })
      .from(schema.employeeSalaryAssignments)
      .innerJoin(schema.employeeProfiles, and(
        eq(schema.employeeSalaryAssignments.employeeId, schema.employeeProfiles.userId),
        eq(schema.employeeProfiles.orgId, orgId),
      ))
      .where(eq(schema.employeeSalaryAssignments.orgId, orgId));

    // Aggregate pay equity by gender
    const genderBreakdown = assignments.reduce((acc, a) => {
      const gender = a.gender ?? 'unspecified';
      if (!acc[gender]) acc[gender] = { count: 0, totalCtc: 0 };
      acc[gender].count += 1;
      acc[gender].totalCtc += Number(a.ctc ?? 0);
      return acc;
    }, {} as Record<string, { count: number; totalCtc: number }>);

    const genderAnalysis = Object.entries(genderBreakdown).map(([gender, data]) => ({
      gender,
      count: data.count,
      averageCtc: data.count > 0 ? Math.round(data.totalCtc / data.count) : 0,
    }));

    return {
      data: {
        genderAnalysis,
        totalEmployeesAnalyzed: assignments.length,
      },
    };
  }

  async getCompensationBenchmarking(orgId: string) {
    // Aggregate compensation by department
    const departmentStats = await this.db
      .select({
        departmentId: schema.employeeProfiles.departmentId,
        avgCtc: sql<number>`avg(cast(${schema.employeeSalaryAssignments.ctc} as numeric))`,
        minCtc: sql<number>`min(cast(${schema.employeeSalaryAssignments.ctc} as numeric))`,
        maxCtc: sql<number>`max(cast(${schema.employeeSalaryAssignments.ctc} as numeric))`,
        count: sql<number>`count(*)`,
      })
      .from(schema.employeeSalaryAssignments)
      .innerJoin(schema.employeeProfiles, and(
        eq(schema.employeeSalaryAssignments.employeeId, schema.employeeProfiles.userId),
        eq(schema.employeeProfiles.orgId, orgId),
      ))
      .where(eq(schema.employeeSalaryAssignments.orgId, orgId))
      .groupBy(schema.employeeProfiles.departmentId);

    // Aggregate by grade
    const gradeStats = await this.db
      .select({
        gradeId: schema.employeeProfiles.gradeId,
        avgCtc: sql<number>`avg(cast(${schema.employeeSalaryAssignments.ctc} as numeric))`,
        minCtc: sql<number>`min(cast(${schema.employeeSalaryAssignments.ctc} as numeric))`,
        maxCtc: sql<number>`max(cast(${schema.employeeSalaryAssignments.ctc} as numeric))`,
        count: sql<number>`count(*)`,
      })
      .from(schema.employeeSalaryAssignments)
      .innerJoin(schema.employeeProfiles, and(
        eq(schema.employeeSalaryAssignments.employeeId, schema.employeeProfiles.userId),
        eq(schema.employeeProfiles.orgId, orgId),
      ))
      .where(eq(schema.employeeSalaryAssignments.orgId, orgId))
      .groupBy(schema.employeeProfiles.gradeId);

    return {
      data: {
        byDepartment: departmentStats.map((s) => ({
          departmentId: s.departmentId,
          averageCtc: Math.round(Number(s.avgCtc ?? 0)),
          minCtc: Math.round(Number(s.minCtc ?? 0)),
          maxCtc: Math.round(Number(s.maxCtc ?? 0)),
          employeeCount: Number(s.count),
        })),
        byGrade: gradeStats.map((s) => ({
          gradeId: s.gradeId,
          averageCtc: Math.round(Number(s.avgCtc ?? 0)),
          minCtc: Math.round(Number(s.minCtc ?? 0)),
          maxCtc: Math.round(Number(s.maxCtc ?? 0)),
          employeeCount: Number(s.count),
        })),
      },
    };
  }

  async getBudgetVsActual(orgId: string) {
    const revisions = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(eq(schema.compensationRevisions.orgId, orgId), eq(schema.compensationRevisions.isActive, true)))
      .orderBy(desc(schema.compensationRevisions.createdAt));

    const analysis = revisions.map((r) => ({
      id: r.id,
      title: r.title,
      fiscalYear: r.fiscalYear,
      totalBudget: Number(r.totalBudget ?? 0),
      allocatedBudget: Number(r.allocatedBudget ?? 0),
      spentBudget: Number(r.spentBudget ?? 0),
      utilizationPercent: Number(r.totalBudget ?? 0) > 0
        ? Math.round((Number(r.spentBudget ?? 0) / Number(r.totalBudget ?? 0)) * 100)
        : 0,
      status: r.status,
    }));

    return { data: analysis, meta: { total: analysis.length } };
  }

  async getTotalRewardsStatement(orgId: string, employeeId: string) {
    // Salary data
    const salaryAssignments = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(and(eq(schema.employeeSalaryAssignments.orgId, orgId), eq(schema.employeeSalaryAssignments.employeeId, employeeId)))
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom));

    // Salary structure details
    const currentAssignment = salaryAssignments[0];
    let salaryStructure = null;
    if (currentAssignment?.salaryStructureId) {
      const structures = await this.db
        .select()
        .from(schema.salaryStructures)
        .where(eq(schema.salaryStructures.id, currentAssignment.salaryStructureId));
      salaryStructure = structures[0] ?? null;
    }

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
        eq(schema.benefitEnrollments.employeeId, employeeId),
        eq(schema.benefitEnrollments.status, 'active'),
      ));

    // Recognition points
    const pointsAccounts = await this.db
      .select()
      .from(schema.recognitionPoints)
      .where(and(eq(schema.recognitionPoints.orgId, orgId), eq(schema.recognitionPoints.employeeId, employeeId)));

    // Employee profile
    const profiles = await this.db
      .select({
        profile: schema.employeeProfiles,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.employeeProfiles)
      .leftJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
      .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.userId, employeeId)));

    return {
      data: {
        employee: profiles[0] ? {
          name: `${profiles[0].firstName} ${profiles[0].lastName ?? ''}`.trim(),
          department: profiles[0].profile.departmentId,
          designation: profiles[0].profile.designationId,
          grade: profiles[0].profile.gradeId,
        } : null,
        compensation: {
          currentCtc: currentAssignment?.ctc ?? '0',
          basicSalary: currentAssignment?.basicSalary ?? '0',
          effectiveFrom: currentAssignment?.effectiveFrom ?? null,
          salaryStructure: salaryStructure ? { name: salaryStructure.name, components: salaryStructure.components } : null,
          componentOverrides: currentAssignment?.componentOverrides ?? {},
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
        history: salaryAssignments.map((a) => ({
          ctc: a.ctc,
          basicSalary: a.basicSalary,
          effectiveFrom: a.effectiveFrom,
          effectiveTo: a.effectiveTo,
        })),
      },
    };
  }
}
