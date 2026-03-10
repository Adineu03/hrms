import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamComplianceDashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getTeamComplianceOverview(orgId: string, userId: string) {
    const [trainingCompletions, acknowledgments] = await Promise.all([
      this.db
        .select()
        .from(schema.trainingCompletions)
        .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.isActive, true))),
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.isActive, true))),
    ]);

    const completedTrainings = trainingCompletions.filter((tc) => tc.status === 'completed').length;
    const overdueTrainings = trainingCompletions.filter((tc) => tc.status === 'overdue').length;
    const completionRate = trainingCompletions.length > 0 ? Math.round((completedTrainings / trainingCompletions.length) * 100) : 0;

    return {
      data: {
        managerId: userId,
        trainings: {
          total: trainingCompletions.length,
          completed: completedTrainings,
          overdue: overdueTrainings,
          completionRate,
        },
        acknowledgments: {
          total: acknowledgments.length,
        },
        overallComplianceScore: completionRate,
      },
    };
  }

  async getTeamMemberStatus(orgId: string, userId: string) {
    const trainingCompletions = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.isActive, true)));

    const memberMap = trainingCompletions.reduce(
      (acc, tc) => {
        if (!acc[tc.employeeId]) {
          acc[tc.employeeId] = { employeeId: tc.employeeId, trainings: [] };
        }
        acc[tc.employeeId].trainings.push({ trainingId: tc.trainingId, status: tc.status, dueDate: tc.dueDate });
        return acc;
      },
      {} as Record<string, { employeeId: string; trainings: Array<{ trainingId: string; status: string; dueDate: Date | null }> }>,
    );

    const members = Object.values(memberMap).map((m) => ({
      employeeId: m.employeeId,
      totalTrainings: m.trainings.length,
      completedTrainings: m.trainings.filter((t) => t.status === 'completed').length,
      overdueTrainings: m.trainings.filter((t) => t.status === 'overdue').length,
      complianceStatus: m.trainings.some((t) => t.status === 'overdue') ? 'at_risk' : 'compliant',
    }));

    return { data: members, meta: { total: members.length } };
  }

  async getOverdueItems(orgId: string, userId: string) {
    const overdueTrainings = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.status, 'overdue'), eq(schema.trainingCompletions.isActive, true)));

    return {
      data: {
        overdueTrainings,
        summary: {
          total: overdueTrainings.length,
        },
      },
    };
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
        newValue: { employeeId, managerId: userId, sentAt: new Date() },
      })
      .returning();

    return { data: { success: true, auditLogId: row.id } };
  }
}
