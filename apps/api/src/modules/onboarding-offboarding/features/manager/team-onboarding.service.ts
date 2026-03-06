import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamOnboardingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return members.map((m) => m.userId);
  }

  async listOnboardings(orgId: string, managerId: string, status?: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const conditions = [
      eq(schema.employeeOnboardings.orgId, orgId),
      inArray(schema.employeeOnboardings.employeeId, teamIds),
      eq(schema.employeeOnboardings.isActive, true),
    ];
    if (status) {
      conditions.push(eq(schema.employeeOnboardings.status, status));
    }

    const rows = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        status: schema.employeeOnboardings.status,
        startDate: schema.employeeOnboardings.startDate,
        targetCompletionDate: schema.employeeOnboardings.targetCompletionDate,
        completedAt: schema.employeeOnboardings.completedAt,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        totalTasks: schema.employeeOnboardings.totalTasks,
        completedTasks: schema.employeeOnboardings.completedTasks,
        buddyId: schema.employeeOnboardings.buddyId,
        probationEndDate: schema.employeeOnboardings.probationEndDate,
        probationStatus: schema.employeeOnboardings.probationStatus,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.employeeOnboardings.createdAt,
      })
      .from(schema.employeeOnboardings)
      .innerJoin(schema.users, eq(schema.employeeOnboardings.employeeId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.employeeOnboardings.createdAt));

    return {
      data: rows.map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        progressPercentage: r.progressPercentage ? Number(r.progressPercentage) : 0,
        completedAt: r.completedAt?.toISOString?.() ?? null,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      total: rows.length,
    };
  }

  async getOnboardingDetail(orgId: string, managerId: string, onboardingId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [row] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        workflowId: schema.employeeOnboardings.workflowId,
        status: schema.employeeOnboardings.status,
        startDate: schema.employeeOnboardings.startDate,
        targetCompletionDate: schema.employeeOnboardings.targetCompletionDate,
        completedAt: schema.employeeOnboardings.completedAt,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        buddyId: schema.employeeOnboardings.buddyId,
        buddyFeedback: schema.employeeOnboardings.buddyFeedback,
        orientationSchedule: schema.employeeOnboardings.orientationSchedule,
        firstDayInfo: schema.employeeOnboardings.firstDayInfo,
        probationEndDate: schema.employeeOnboardings.probationEndDate,
        probationStatus: schema.employeeOnboardings.probationStatus,
        probationReviews: schema.employeeOnboardings.probationReviews,
        checkinSchedule: schema.employeeOnboardings.checkinSchedule,
        totalTasks: schema.employeeOnboardings.totalTasks,
        completedTasks: schema.employeeOnboardings.completedTasks,
        metadata: schema.employeeOnboardings.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.employeeOnboardings.createdAt,
        updatedAt: schema.employeeOnboardings.updatedAt,
      })
      .from(schema.employeeOnboardings)
      .innerJoin(schema.users, eq(schema.employeeOnboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      );

    if (!row || !teamIds.includes(row.employeeId)) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Fetch tasks for this onboarding
    const tasks = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.onboardingId, onboardingId),
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .orderBy(schema.employeeOnboardingTasks.dueDate);

    return {
      ...row,
      employeeName: `${row.firstName} ${row.lastName ?? ''}`.trim(),
      progressPercentage: row.progressPercentage ? Number(row.progressPercentage) : 0,
      completedAt: row.completedAt?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
      tasks: tasks.map((t) => ({
        ...t,
        completedAt: t.completedAt?.toISOString?.() ?? null,
        verifiedAt: t.verifiedAt?.toISOString?.() ?? null,
        createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
        updatedAt: t.updatedAt?.toISOString?.() ?? t.updatedAt,
      })),
    };
  }

  async completeTask(orgId: string, managerId: string, onboardingId: string, taskId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [onboarding] = await this.db
      .select({ id: schema.employeeOnboardings.id, employeeId: schema.employeeOnboardings.employeeId })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Onboarding record not found');
    }

    const [task] = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.id, taskId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboardingId),
          eq(schema.employeeOnboardingTasks.orgId, orgId),
        ),
      );

    if (!task) throw new NotFoundException('Task not found');
    if (task.status === 'completed') throw new BadRequestException('Task already completed');

    await this.db
      .update(schema.employeeOnboardingTasks)
      .set({ status: 'completed', completedAt: new Date(), completedBy: managerId, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardingTasks.id, taskId));

    // Update completed task count
    const completedCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.onboardingId, onboardingId),
          eq(schema.employeeOnboardingTasks.status, 'completed'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      );

    const completed = completedCount[0]?.count ?? 0;
    const total = onboarding ? (await this.db
      .select({ totalTasks: schema.employeeOnboardings.totalTasks })
      .from(schema.employeeOnboardings)
      .where(eq(schema.employeeOnboardings.id, onboardingId)))[0]?.totalTasks ?? 0 : 0;

    const progress = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
    await this.db
      .update(schema.employeeOnboardings)
      .set({ completedTasks: completed, progressPercentage: progress.toString(), updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, onboardingId));

    return { message: 'Task completed successfully', taskId, completedTasks: completed, progressPercentage: progress };
  }

  async getPendingTasks(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const tasks = await this.db
      .select({
        id: schema.employeeOnboardingTasks.id,
        onboardingId: schema.employeeOnboardingTasks.onboardingId,
        employeeId: schema.employeeOnboardingTasks.employeeId,
        title: schema.employeeOnboardingTasks.title,
        description: schema.employeeOnboardingTasks.description,
        taskType: schema.employeeOnboardingTasks.taskType,
        taskOwner: schema.employeeOnboardingTasks.taskOwner,
        status: schema.employeeOnboardingTasks.status,
        dueDate: schema.employeeOnboardingTasks.dueDate,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.employeeOnboardingTasks.createdAt,
      })
      .from(schema.employeeOnboardingTasks)
      .innerJoin(schema.users, eq(schema.employeeOnboardingTasks.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          inArray(schema.employeeOnboardingTasks.employeeId, teamIds),
          eq(schema.employeeOnboardingTasks.status, 'pending'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .orderBy(schema.employeeOnboardingTasks.dueDate);

    return {
      data: tasks.map((t) => ({
        ...t,
        employeeName: `${t.firstName} ${t.lastName ?? ''}`.trim(),
        createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
      })),
      total: tasks.length,
    };
  }

  async getChecklistProgress(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [] };

    const onboardings = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        startDate: schema.employeeOnboardings.startDate,
        totalTasks: schema.employeeOnboardings.totalTasks,
        completedTasks: schema.employeeOnboardings.completedTasks,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        checkinSchedule: schema.employeeOnboardings.checkinSchedule,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.employeeOnboardings)
      .innerJoin(schema.users, eq(schema.employeeOnboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          inArray(schema.employeeOnboardings.employeeId, teamIds),
          eq(schema.employeeOnboardings.isActive, true),
          eq(schema.employeeOnboardings.status, 'in_progress'),
        ),
      );

    return {
      data: onboardings.map((o) => ({
        onboardingId: o.id,
        employeeId: o.employeeId,
        employeeName: `${o.firstName} ${o.lastName ?? ''}`.trim(),
        startDate: o.startDate,
        totalTasks: o.totalTasks,
        completedTasks: o.completedTasks,
        progressPercentage: o.progressPercentage ? Number(o.progressPercentage) : 0,
        checkinSchedule: o.checkinSchedule,
      })),
    };
  }

  async sendReminder(orgId: string, managerId: string, onboardingId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [onboarding] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        metadata: schema.employeeOnboardings.metadata,
      })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Onboarding record not found');
    }

    const existingMeta = (onboarding.metadata as Record<string, any>) ?? {};
    const reminders = existingMeta.reminders ?? [];
    reminders.push({ sentBy: managerId, sentAt: new Date().toISOString(), type: 'pending_tasks' });

    await this.db
      .update(schema.employeeOnboardings)
      .set({ metadata: { ...existingMeta, reminders }, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, onboardingId));

    return { message: 'Reminder sent successfully', onboardingId };
  }
}
