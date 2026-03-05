import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { grades } from '../../../../infrastructure/database/schema/grades';
import { employeeSalaryAssignments } from '../../../../infrastructure/database/schema/salary-structures';

@Injectable()
export class CompensationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getSummary(orgId: string, managerId: string) {
    const rows = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        gradeName: grades.name,
        salaryBandMin: grades.salaryBandMin,
        salaryBandMax: grades.salaryBandMax,
        currency: grades.currency,
        ctc: employeeSalaryAssignments.ctc,
        basicSalary: employeeSalaryAssignments.basicSalary,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(grades, eq(employeeProfiles.gradeId, grades.id))
      .leftJoin(
        employeeSalaryAssignments,
        and(
          eq(employeeSalaryAssignments.employeeId, users.id),
          eq(employeeSalaryAssignments.orgId, orgId),
        ),
      )
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
        ),
      );

    const ctcValues = rows
      .map((r) => (r.ctc ? parseFloat(r.ctc) : null))
      .filter((v): v is number => v !== null);

    const min = ctcValues.length > 0 ? Math.min(...ctcValues) : 0;
    const max = ctcValues.length > 0 ? Math.max(...ctcValues) : 0;
    const avg =
      ctcValues.length > 0
        ? ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length
        : 0;

    const members = rows.map((r) => ({
      userId: r.userId,
      name: [r.firstName, r.lastName].filter(Boolean).join(' '),
      gradeName: r.gradeName,
      salaryBandMin: r.salaryBandMin ? parseFloat(r.salaryBandMin) : null,
      salaryBandMax: r.salaryBandMax ? parseFloat(r.salaryBandMax) : null,
      ctc: r.ctc ? parseFloat(r.ctc) : null,
      basicSalary: r.basicSalary ? parseFloat(r.basicSalary) : null,
      currency: r.currency,
      bandPosition:
        r.ctc && r.salaryBandMin && r.salaryBandMax
          ? Math.round(
              ((parseFloat(r.ctc) - parseFloat(r.salaryBandMin)) /
                (parseFloat(r.salaryBandMax) - parseFloat(r.salaryBandMin))) *
                100,
            )
          : null,
    }));

    return {
      teamSize: rows.length,
      summary: { min, max, avg: Math.round(avg * 100) / 100 },
      members,
    };
  }

  async getHistory(orgId: string, managerId: string, userId: string) {
    // Verify the employee is a direct report
    const [report] = await this.db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(users.id, userId),
          eq(users.orgId, orgId),
          eq(employeeProfiles.managerId, managerId),
        ),
      )
      .limit(1);

    if (!report) {
      throw new NotFoundException('Employee not found or not in your team');
    }

    const history = await this.db
      .select()
      .from(employeeSalaryAssignments)
      .where(
        and(
          eq(employeeSalaryAssignments.employeeId, userId),
          eq(employeeSalaryAssignments.orgId, orgId),
        ),
      )
      .orderBy(desc(employeeSalaryAssignments.effectiveFrom));

    return { employeeId: userId, history };
  }
}
