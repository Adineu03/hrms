import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SalaryStructureService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getCurrentSalary(orgId: string, userId: string) {
    // Get the current (latest) salary assignment
    const assignments = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(
        and(
          eq(schema.employeeSalaryAssignments.orgId, orgId),
          eq(schema.employeeSalaryAssignments.employeeId, userId),
        ),
      )
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
      .limit(1);

    if (!assignments.length) {
      return {
        data: {
          message: 'No salary structure assigned yet',
          ctc: null,
          basicSalary: null,
          structure: null,
        },
      };
    }

    const assignment = assignments[0];

    // Get the salary structure details
    const structures = await this.db
      .select()
      .from(schema.salaryStructures)
      .where(
        and(
          eq(schema.salaryStructures.id, assignment.salaryStructureId),
          eq(schema.salaryStructures.orgId, orgId),
        ),
      )
      .limit(1);

    const structure = structures[0] ?? null;
    const ctc = parseFloat(assignment.ctc ?? '0');
    const basic = parseFloat(assignment.basicSalary ?? '0');

    // Compute monthly breakdown
    const monthlyCtc = ctc;
    const monthlyBasic = basic;
    const monthlyHra = monthlyBasic * 0.4;
    const monthlyDa = monthlyBasic * 0.1;
    const monthlySpecial = monthlyCtc - monthlyBasic - monthlyHra - monthlyDa;

    return {
      data: {
        structureName: structure?.name ?? 'Custom',
        ctc: assignment.ctc,
        basicSalary: assignment.basicSalary,
        effectiveFrom: assignment.effectiveFrom,
        effectiveTo: assignment.effectiveTo,
        componentOverrides: assignment.componentOverrides,
        monthlyBreakdown: {
          basic: monthlyBasic.toFixed(2),
          hra: monthlyHra.toFixed(2),
          da: monthlyDa.toFixed(2),
          specialAllowance: Math.max(0, monthlySpecial).toFixed(2),
          grossMonthly: monthlyCtc.toFixed(2),
        },
        annualBreakdown: {
          basic: (monthlyBasic * 12).toFixed(2),
          hra: (monthlyHra * 12).toFixed(2),
          da: (monthlyDa * 12).toFixed(2),
          specialAllowance: (Math.max(0, monthlySpecial) * 12).toFixed(2),
          grossAnnual: (monthlyCtc * 12).toFixed(2),
        },
        components: structure?.components ?? [],
      },
    };
  }

  async getSalaryHistory(orgId: string, userId: string) {
    const assignments = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(
        and(
          eq(schema.employeeSalaryAssignments.orgId, orgId),
          eq(schema.employeeSalaryAssignments.employeeId, userId),
        ),
      )
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom));

    // Also get compensation revision items for this employee
    const revisionItems = await this.db
      .select()
      .from(schema.compensationRevisionItems)
      .where(
        and(
          eq(schema.compensationRevisionItems.orgId, orgId),
          eq(schema.compensationRevisionItems.employeeId, userId),
          eq(schema.compensationRevisionItems.isActive, true),
        ),
      )
      .orderBy(desc(schema.compensationRevisionItems.createdAt));

    return {
      data: {
        salaryAssignments: assignments,
        revisionItems,
      },
      meta: { totalAssignments: assignments.length, totalRevisions: revisionItems.length },
    };
  }

  async getCompensationLetter(orgId: string, userId: string) {
    // Get the latest salary assignment for generating a letter URL
    const assignments = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(
        and(
          eq(schema.employeeSalaryAssignments.orgId, orgId),
          eq(schema.employeeSalaryAssignments.employeeId, userId),
        ),
      )
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
      .limit(1);

    if (!assignments.length) {
      return {
        data: {
          available: false,
          message: 'No compensation letter available. Please contact HR.',
          downloadUrl: null,
        },
      };
    }

    return {
      data: {
        available: true,
        assignmentId: assignments[0].id,
        effectiveFrom: assignments[0].effectiveFrom,
        ctc: assignments[0].ctc,
        downloadUrl: `/api/v1/payroll-processing/employee/salary/compensation-letter/pdf`,
      },
    };
  }

  async getBenefitsSummary(orgId: string, userId: string) {
    // Get benefit plan enrollments for the employee
    const benefitPlans = await this.db
      .select()
      .from(schema.benefitPlans)
      .where(
        and(
          eq(schema.benefitPlans.orgId, orgId),
          eq(schema.benefitPlans.isActive, true),
        ),
      );

    // Get employee's salary for context
    const [assignment] = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(
        and(
          eq(schema.employeeSalaryAssignments.orgId, orgId),
          eq(schema.employeeSalaryAssignments.employeeId, userId),
        ),
      )
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
      .limit(1);

    const basic = parseFloat(assignment?.basicSalary ?? '0');

    // Statutory benefits
    const statutoryBenefits = [
      { name: 'Provident Fund (PF)', type: 'statutory', employerContribution: (basic * 0.12).toFixed(2), employeeContribution: (basic * 0.12).toFixed(2), frequency: 'monthly' },
      { name: 'Employee State Insurance (ESI)', type: 'statutory', employerContribution: (basic * 0.0325).toFixed(2), employeeContribution: (basic * 0.0075).toFixed(2), frequency: 'monthly' },
      { name: 'Gratuity', type: 'statutory', employerContribution: (basic * 0.0481).toFixed(2), employeeContribution: '0', frequency: 'monthly' },
    ];

    return {
      data: {
        statutoryBenefits,
        orgBenefitPlans: benefitPlans.map((bp) => ({
          id: bp.id,
          name: bp.name,
          type: bp.type,
          description: bp.description,
        })),
      },
    };
  }
}
