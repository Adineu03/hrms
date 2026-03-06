import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class IncrementPlanningService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listActiveRevisions(orgId: string) {
    const revisions = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(
        eq(schema.compensationRevisions.orgId, orgId),
        eq(schema.compensationRevisions.isActive, true),
        or(
          eq(schema.compensationRevisions.status, 'in_progress'),
          eq(schema.compensationRevisions.status, 'draft'),
        ),
      ))
      .orderBy(desc(schema.compensationRevisions.createdAt));

    return { data: revisions, meta: { total: revisions.length } };
  }

  async getTeamMembersInRevision(orgId: string, managerId: string, revisionId: string) {
    // Get direct reports
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));

    const teamMemberIds = teamMembers.map((m) => m.userId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get revision items for team members
    const items = await this.db
      .select({
        item: schema.compensationRevisionItems,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.compensationRevisionItems)
      .leftJoin(schema.users, eq(schema.compensationRevisionItems.employeeId, schema.users.id))
      .where(and(
        eq(schema.compensationRevisionItems.revisionId, revisionId),
        eq(schema.compensationRevisionItems.orgId, orgId),
        eq(schema.compensationRevisionItems.isActive, true),
        sql`${schema.compensationRevisionItems.employeeId} = ANY(${teamMemberIds})`,
      ))
      .orderBy(desc(schema.compensationRevisionItems.createdAt));

    return {
      data: items.map((i) => ({
        ...i.item,
        employeeName: `${i.firstName} ${i.lastName ?? ''}`.trim(),
      })),
      meta: { total: items.length },
    };
  }

  async proposeIncrement(orgId: string, managerId: string, revisionId: string, dto: {
    employeeId: string;
    proposedCtc: string;
    incrementPercent: string;
    incrementAmount: string;
    meritScore?: number;
    remarks?: string;
  }) {
    // Verify revision exists and is in progress
    const revision = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(
        eq(schema.compensationRevisions.id, revisionId),
        eq(schema.compensationRevisions.orgId, orgId),
        eq(schema.compensationRevisions.isActive, true),
      ));

    if (!revision.length) throw new NotFoundException('Compensation revision not found');

    // Check if item already exists
    const existingItem = await this.db
      .select()
      .from(schema.compensationRevisionItems)
      .where(and(
        eq(schema.compensationRevisionItems.revisionId, revisionId),
        eq(schema.compensationRevisionItems.employeeId, dto.employeeId),
        eq(schema.compensationRevisionItems.orgId, orgId),
        eq(schema.compensationRevisionItems.isActive, true),
      ));

    if (existingItem.length) {
      // Update existing
      const [row] = await this.db
        .update(schema.compensationRevisionItems)
        .set({
          proposedCtc: dto.proposedCtc,
          incrementPercent: dto.incrementPercent,
          incrementAmount: dto.incrementAmount,
          meritScore: dto.meritScore ?? null,
          remarks: dto.remarks ?? null,
          proposedBy: managerId,
          status: 'proposed',
          updatedAt: new Date(),
        })
        .where(eq(schema.compensationRevisionItems.id, existingItem[0].id))
        .returning();

      return { data: row };
    }

    // Get current CTC
    const currentSalary = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(and(
        eq(schema.employeeSalaryAssignments.orgId, orgId),
        eq(schema.employeeSalaryAssignments.employeeId, dto.employeeId),
      ))
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
      .limit(1);

    const [row] = await this.db
      .insert(schema.compensationRevisionItems)
      .values({
        orgId,
        revisionId,
        employeeId: dto.employeeId,
        currentCtc: currentSalary[0]?.ctc ?? '0',
        proposedCtc: dto.proposedCtc,
        incrementPercent: dto.incrementPercent,
        incrementAmount: dto.incrementAmount,
        meritScore: dto.meritScore ?? null,
        remarks: dto.remarks ?? null,
        proposedBy: managerId,
        status: 'proposed',
      })
      .returning();

    return { data: row };
  }

  async getTeamComparison(orgId: string, managerId: string) {
    // Get direct reports with salary data
    const teamMembers = await this.db
      .select({
        userId: schema.employeeProfiles.userId,
        employeeId: schema.employeeProfiles.employeeId,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        gradeId: schema.employeeProfiles.gradeId,
        designationId: schema.employeeProfiles.designationId,
        dateOfJoining: schema.employeeProfiles.dateOfJoining,
      })
      .from(schema.employeeProfiles)
      .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));

    const comparison = await Promise.all(
      teamMembers.map(async (member) => {
        const salary = await this.db
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
          gradeId: member.gradeId,
          designationId: member.designationId,
          dateOfJoining: member.dateOfJoining,
          currentCtc: salary[0]?.ctc ?? '0',
          basicSalary: salary[0]?.basicSalary ?? '0',
        };
      }),
    );

    return { data: comparison, meta: { total: comparison.length } };
  }
}
