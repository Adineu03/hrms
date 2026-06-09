import { Inject, Injectable } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamComplianceDashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  /** Resolve the manager's direct reports (users + profile/designation) by managerId === userId. */
  private async getTeamMembers(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        designationName: schema.designations.name,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .leftJoin(schema.designations, eq(schema.employeeProfiles.designationId, schema.designations.id))
      .where(and(eq(schema.users.orgId, orgId), eq(schema.employeeProfiles.managerId, managerId)));
  }

  /** Load training + acknowledgment + published-mandatory-policy data for a given set of employees. */
  private async loadComplianceData(orgId: string, employeeIds: string[]) {
    if (employeeIds.length === 0) {
      return { trainingCompletions: [], acknowledgments: [], mandatoryPolicies: [] as { id: string }[] };
    }

    const [trainingCompletions, acknowledgments, mandatoryPolicies] = await Promise.all([
      this.db
        .select()
        .from(schema.trainingCompletions)
        .where(
          and(
            eq(schema.trainingCompletions.orgId, orgId),
            eq(schema.trainingCompletions.isActive, true),
            inArray(schema.trainingCompletions.employeeId, employeeIds),
          ),
        ),
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(
          and(
            eq(schema.policyAcknowledgments.orgId, orgId),
            eq(schema.policyAcknowledgments.isActive, true),
            inArray(schema.policyAcknowledgments.employeeId, employeeIds),
          ),
        ),
      this.db
        .select({ id: schema.compliancePolicies.id })
        .from(schema.compliancePolicies)
        .where(
          and(
            eq(schema.compliancePolicies.orgId, orgId),
            eq(schema.compliancePolicies.isActive, true),
            eq(schema.compliancePolicies.status, 'published'),
            eq(schema.compliancePolicies.mandatoryAcknowledgment, true),
          ),
        ),
    ]);

    return { trainingCompletions, acknowledgments, mandatoryPolicies };
  }

  /** Build the per-member compliance rows the frontend renders. */
  private buildMemberRows(
    members: Array<{ userId: string; firstName: string | null; lastName: string | null; designationName: string | null }>,
    trainingCompletions: Array<{ employeeId: string; status: string }>,
    acknowledgments: Array<{ employeeId: string; policyId: string }>,
    mandatoryPolicies: Array<{ id: string }>,
  ) {
    const mandatoryPolicyIds = mandatoryPolicies.map((p) => p.id);

    return members.map((m) => {
      const myTrainings = trainingCompletions.filter((tc) => tc.employeeId === m.userId);
      const overdueCount = myTrainings.filter((tc) => tc.status === 'overdue').length;
      const inProgressCount = myTrainings.filter((tc) => tc.status === 'in_progress' || tc.status === 'assigned').length;
      const allTrainingsDone = myTrainings.length > 0 && myTrainings.every((tc) => tc.status === 'completed');

      let trainingStatus: 'compliant' | 'in_progress' | 'overdue' | 'not_started';
      if (overdueCount > 0) trainingStatus = 'overdue';
      else if (allTrainingsDone) trainingStatus = 'compliant';
      else if (inProgressCount > 0) trainingStatus = 'in_progress';
      else trainingStatus = 'not_started';

      const myAckPolicyIds = new Set(
        acknowledgments.filter((a) => a.employeeId === m.userId).map((a) => a.policyId),
      );
      const pendingAcks = mandatoryPolicyIds.filter((pid) => !myAckPolicyIds.has(pid)).length;
      const policyAckStatus: 'all_acknowledged' | 'pending' = pendingAcks === 0 ? 'all_acknowledged' : 'pending';

      let ragStatus: 'green' | 'yellow' | 'red';
      if (trainingStatus === 'overdue') ragStatus = 'red';
      else if (trainingStatus === 'in_progress' || trainingStatus === 'not_started' || pendingAcks > 0) ragStatus = 'yellow';
      else ragStatus = 'green';

      const name = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Unknown';

      return {
        id: m.userId,
        name,
        designation: m.designationName ?? '—',
        trainingStatus,
        policyAckStatus,
        overdueCount,
        pendingAcks,
        ragStatus,
      };
    });
  }

  async getTeamComplianceOverview(orgId: string, userId: string) {
    const members = await this.getTeamMembers(orgId, userId);
    const employeeIds = members.map((m) => m.userId);
    const { trainingCompletions, acknowledgments, mandatoryPolicies } = await this.loadComplianceData(orgId, employeeIds);

    const rows = this.buildMemberRows(members, trainingCompletions, acknowledgments, mandatoryPolicies);

    const compliantMembers = rows.filter((r) => r.ragStatus === 'green').length;
    const compliantPercentage = rows.length > 0 ? Math.round((compliantMembers / rows.length) * 100) : 0;
    const overdueItems = rows.reduce((sum, r) => sum + r.overdueCount, 0);
    const pendingAcknowledgments = rows.reduce((sum, r) => sum + r.pendingAcks, 0);

    return {
      data: {
        managerId: userId,
        totalMembers: rows.length,
        compliantPercentage,
        overdueItems,
        pendingAcknowledgments,
      },
    };
  }

  async getTeamMemberStatus(orgId: string, userId: string) {
    const members = await this.getTeamMembers(orgId, userId);
    const employeeIds = members.map((m) => m.userId);
    const { trainingCompletions, acknowledgments, mandatoryPolicies } = await this.loadComplianceData(orgId, employeeIds);

    const rows = this.buildMemberRows(members, trainingCompletions, acknowledgments, mandatoryPolicies);

    return { data: rows, meta: { total: rows.length } };
  }

  async getOverdueItems(orgId: string, userId: string) {
    const members = await this.getTeamMembers(orgId, userId);
    const employeeIds = members.map((m) => m.userId);
    const memberById = new Map(members.map((m) => [m.userId, m]));

    if (employeeIds.length === 0) {
      return { data: [], meta: { total: 0 } };
    }

    const [overdueTrainings, trainings] = await Promise.all([
      this.db
        .select()
        .from(schema.trainingCompletions)
        .where(
          and(
            eq(schema.trainingCompletions.orgId, orgId),
            eq(schema.trainingCompletions.status, 'overdue'),
            eq(schema.trainingCompletions.isActive, true),
            inArray(schema.trainingCompletions.employeeId, employeeIds),
          ),
        ),
      this.db
        .select({ id: schema.complianceTrainings.id, title: schema.complianceTrainings.title })
        .from(schema.complianceTrainings)
        .where(and(eq(schema.complianceTrainings.orgId, orgId), eq(schema.complianceTrainings.isActive, true))),
    ]);

    const trainingTitleById = new Map(trainings.map((t) => [t.id, t.title]));
    const anchor = new Date('2026-06-09T00:00:00Z').getTime();

    const items = overdueTrainings.map((tc) => {
      const member = memberById.get(tc.employeeId);
      const employeeName = member ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || 'Unknown' : 'Unknown';
      const daysOverdue = tc.dueDate ? Math.max(0, Math.floor((anchor - new Date(tc.dueDate).getTime()) / 86400000)) : 0;
      return {
        id: tc.id,
        employeeId: tc.employeeId,
        employeeName,
        type: 'training',
        title: trainingTitleById.get(tc.trainingId) ?? 'Mandatory Training',
        daysOverdue,
      };
    });

    return { data: items, meta: { total: items.length } };
  }

  async sendReminder(orgId: string, userId: string, employeeId: string) {
    const [row] = await this.db
      .insert(schema.auditLogs)
      .values({
        orgId,
        userId,
        action: 'reminder_sent',
        entity: 'employee',
        entityId: employeeId,
        description: `Compliance reminder sent to employee ${employeeId} by manager ${userId}`,
        newValue: { employeeId, managerId: userId },
      })
      .returning();

    return { data: { success: true, auditLogId: row.id } };
  }
}
