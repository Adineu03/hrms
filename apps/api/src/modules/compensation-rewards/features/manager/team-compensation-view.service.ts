import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamCompensationViewService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getTeamSalaryOverview(orgId: string, managerId: string) {
    // Get direct reports
    const teamMembers = await this.db
      .select({
        userId: schema.employeeProfiles.userId,
        employeeId: schema.employeeProfiles.employeeId,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        departmentId: schema.employeeProfiles.departmentId,
        designationId: schema.employeeProfiles.designationId,
        gradeId: schema.employeeProfiles.gradeId,
      })
      .from(schema.employeeProfiles)
      .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));

    // Get salary assignments for team members
    const teamWithSalary = await Promise.all(
      teamMembers.map(async (member) => {
        const salaryAssignments = await this.db
          .select()
          .from(schema.employeeSalaryAssignments)
          .where(and(
            eq(schema.employeeSalaryAssignments.orgId, orgId),
            eq(schema.employeeSalaryAssignments.employeeId, member.userId),
          ))
          .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
          .limit(1);

        return {
          userId: member.userId,
          employeeId: member.employeeId,
          name: `${member.firstName} ${member.lastName ?? ''}`.trim(),
          departmentId: member.departmentId,
          designationId: member.designationId,
          gradeId: member.gradeId,
          currentCtc: salaryAssignments[0]?.ctc ?? '0',
          basicSalary: salaryAssignments[0]?.basicSalary ?? '0',
          effectiveFrom: salaryAssignments[0]?.effectiveFrom ?? null,
        };
      }),
    );

    return { data: teamWithSalary, meta: { total: teamWithSalary.length } };
  }

  async getCompensationHistory(orgId: string, managerId: string, employeeId: string) {
    // Verify the employee is a direct report
    const directReport = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.userId, employeeId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));

    if (!directReport.length) {
      return { data: [], meta: { total: 0 } };
    }

    const history = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(and(
        eq(schema.employeeSalaryAssignments.orgId, orgId),
        eq(schema.employeeSalaryAssignments.employeeId, employeeId),
      ))
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom));

    // Include revision items for this employee
    const revisionItems = await this.db
      .select({
        item: schema.compensationRevisionItems,
        revisionTitle: schema.compensationRevisions.title,
        revisionType: schema.compensationRevisions.type,
        fiscalYear: schema.compensationRevisions.fiscalYear,
      })
      .from(schema.compensationRevisionItems)
      .leftJoin(schema.compensationRevisions, eq(schema.compensationRevisionItems.revisionId, schema.compensationRevisions.id))
      .where(and(
        eq(schema.compensationRevisionItems.orgId, orgId),
        eq(schema.compensationRevisionItems.employeeId, employeeId),
        eq(schema.compensationRevisionItems.isActive, true),
      ))
      .orderBy(desc(schema.compensationRevisionItems.createdAt));

    return {
      data: {
        salaryHistory: history,
        revisionHistory: revisionItems.map((r) => ({
          ...r.item,
          revisionTitle: r.revisionTitle,
          revisionType: r.revisionType,
          fiscalYear: r.fiscalYear,
        })),
      },
    };
  }

  async getBudgetUtilization(orgId: string, managerId: string) {
    // Get team members
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));

    const teamMemberIds = teamMembers.map((m) => m.userId);

    if (!teamMemberIds.length) {
      return { data: { teamSize: 0, totalCtc: 0, averageCtc: 0, revisionSummary: [] } };
    }

    // Get current salary data
    const salaryData = await this.db
      .select({
        totalCtc: sql<number>`coalesce(sum(cast(${schema.employeeSalaryAssignments.ctc} as numeric)), 0)`,
        avgCtc: sql<number>`coalesce(avg(cast(${schema.employeeSalaryAssignments.ctc} as numeric)), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.employeeSalaryAssignments)
      .where(and(
        eq(schema.employeeSalaryAssignments.orgId, orgId),
        sql`${schema.employeeSalaryAssignments.employeeId} = ANY(${teamMemberIds})`,
      ));

    return {
      data: {
        teamSize: teamMemberIds.length,
        totalCtc: Math.round(Number(salaryData[0]?.totalCtc ?? 0)),
        averageCtc: Math.round(Number(salaryData[0]?.avgCtc ?? 0)),
        assignmentsCount: Number(salaryData[0]?.count ?? 0),
      },
    };
  }
}
