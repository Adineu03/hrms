import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import {
  salaryStructures,
  employeeSalaryAssignments,
} from '../../../../infrastructure/database/schema/salary-structures';

@Injectable()
export class PayslipService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getSalaryStructure(orgId: string, userId: string) {
    // Find the active salary assignment for this employee
    const assignments = await this.db
      .select()
      .from(employeeSalaryAssignments)
      .where(
        and(
          eq(employeeSalaryAssignments.orgId, orgId),
          eq(employeeSalaryAssignments.employeeId, userId),
        ),
      );

    if (assignments.length === 0) {
      return {
        message: 'No salary structure assigned yet',
        salaryStructure: null,
        assignment: null,
      };
    }

    // Get the most recent active assignment (no effectiveTo or effectiveTo in the future)
    const now = new Date();
    const activeAssignment =
      assignments.find(
        (a) => !a.effectiveTo || new Date(a.effectiveTo) > now,
      ) ?? assignments[0];

    // Fetch the salary structure details
    const [structure] = await this.db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, activeAssignment.salaryStructureId))
      .limit(1);

    return {
      message: 'Salary structure found',
      salaryStructure: structure
        ? {
            id: structure.id,
            name: structure.name,
            description: structure.description,
            components: structure.components,
          }
        : null,
      assignment: {
        id: activeAssignment.id,
        ctc: activeAssignment.ctc,
        basicSalary: activeAssignment.basicSalary,
        effectiveFrom: activeAssignment.effectiveFrom,
        effectiveTo: activeAssignment.effectiveTo,
        componentOverrides: activeAssignment.componentOverrides,
      },
    };
  }

  async getTaxSummary(_orgId: string, _userId: string) {
    return {
      message:
        'Tax summary will be available when Payroll module is activated',
      data: null,
    };
  }

  async getHistory(_orgId: string, _userId: string) {
    return {
      message:
        'Payslip history will be available when Payroll module is activated',
      payslips: [],
    };
  }
}
