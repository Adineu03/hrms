import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyOnboardingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Helper: Get Employee Onboarding Record ──────────────────────────
  private async getOnboarding(orgId: string, employeeId: string) {
    const [onboarding] = await this.db
      .select()
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.employeeId, employeeId),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      )
      .orderBy(desc(schema.employeeOnboardings.createdAt))
      .limit(1);

    if (!onboarding) {
      throw new NotFoundException('No active onboarding found for your account');
    }

    return onboarding;
  }

  // ── Get Onboarding Overview ─────────────────────────────────────────
  async getOverview(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    let buddyName: string | null = null;
    if (onboarding.buddyId) {
      const [buddy] = await this.db
        .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.id, onboarding.buddyId))
        .limit(1);
      if (buddy) {
        buddyName = [buddy.firstName, buddy.lastName].filter(Boolean).join(' ');
      }
    }

    return {
      id: onboarding.id,
      status: onboarding.status,
      progressPercentage: Number(onboarding.progressPercentage) || 0,
      totalTasks: onboarding.totalTasks,
      completedTasks: onboarding.completedTasks,
      startDate: onboarding.startDate,
      targetCompletionDate: onboarding.targetCompletionDate,
      completedAt: onboarding.completedAt?.toISOString() || null,
      buddyId: onboarding.buddyId,
      buddyName,
      probationEndDate: onboarding.probationEndDate,
      probationStatus: onboarding.probationStatus,
    };
  }

  // ── Get Onboarding Checklist ────────────────────────────────────────
  async getChecklist(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const tasks = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .orderBy(schema.employeeOnboardingTasks.createdAt);

    return {
      onboardingId: onboarding.id,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'completed').length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        taskType: t.taskType,
        taskOwner: t.taskOwner,
        status: t.status,
        dueDate: t.dueDate,
        completedAt: t.completedAt?.toISOString() || null,
        verificationStatus: t.verificationStatus,
        notes: t.notes,
        attachments: t.attachments,
      })),
    };
  }

  // ── Complete a Task ─────────────────────────────────────────────────
  async completeTask(orgId: string, employeeId: string, taskId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const [task] = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.id, taskId),
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.employeeId, employeeId),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .limit(1);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status === 'completed') {
      throw new BadRequestException('Task is already completed');
    }

    const [updated] = await this.db
      .update(schema.employeeOnboardingTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completedBy: employeeId,
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeOnboardingTasks.id, taskId))
      .returning();

    // Update onboarding progress
    const newCompleted = (onboarding.completedTasks || 0) + 1;
    const total = onboarding.totalTasks || 1;
    const percentage = Math.min(Math.round((newCompleted / total) * 100), 100);

    await this.db
      .update(schema.employeeOnboardings)
      .set({
        completedTasks: newCompleted,
        progressPercentage: String(percentage),
        status: percentage >= 100 ? 'completed' : 'in_progress',
        completedAt: percentage >= 100 ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeOnboardings.id, onboarding.id));

    return {
      taskId: updated.id,
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() || null,
      progressPercentage: percentage,
    };
  }

  // ── View Orientation Schedule ───────────────────────────────────────
  async getOrientation(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);
    return {
      onboardingId: onboarding.id,
      orientationSchedule: onboarding.orientationSchedule || [],
    };
  }

  // ── Meet Your Team ──────────────────────────────────────────────────
  async getTeam(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    let buddyInfo: Record<string, any> | null = null;
    if (onboarding.buddyId) {
      const [buddy] = await this.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          role: schema.users.role,
        })
        .from(schema.users)
        .where(eq(schema.users.id, onboarding.buddyId))
        .limit(1);
      if (buddy) {
        buddyInfo = {
          id: buddy.id,
          name: [buddy.firstName, buddy.lastName].filter(Boolean).join(' '),
          email: buddy.email,
          role: buddy.role,
        };
      }
    }

    // Get team members from same org
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, employeeId),
        ),
      )
      .limit(1);

    let teamMembers: Array<Record<string, any>> = [];
    if (profile?.departmentId) {
      const members = await this.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          role: schema.users.role,
        })
        .from(schema.employeeProfiles)
        .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            eq(schema.employeeProfiles.departmentId, profile.departmentId),
            eq(schema.users.isActive, true),
          ),
        )
        .limit(20);

      teamMembers = members.map((m) => ({
        id: m.id,
        name: [m.firstName, m.lastName].filter(Boolean).join(' '),
        email: m.email,
        role: m.role,
      }));
    }

    return {
      onboardingId: onboarding.id,
      buddy: buddyInfo,
      teamMembers,
    };
  }

  // ── First-Day Essentials ────────────────────────────────────────────
  async getFirstDayInfo(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);
    return {
      onboardingId: onboarding.id,
      firstDayInfo: onboarding.firstDayInfo || {},
      startDate: onboarding.startDate,
    };
  }

  // ── Progress Tracker ────────────────────────────────────────────────
  async getProgress(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const tasks = await this.db
      .select({
        taskType: schema.employeeOnboardingTasks.taskType,
        status: schema.employeeOnboardingTasks.status,
      })
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      );

    const byType: Record<string, { total: number; completed: number }> = {};
    for (const t of tasks) {
      if (!byType[t.taskType]) byType[t.taskType] = { total: 0, completed: 0 };
      byType[t.taskType].total++;
      if (t.status === 'completed') byType[t.taskType].completed++;
    }

    return {
      onboardingId: onboarding.id,
      status: onboarding.status,
      progressPercentage: Number(onboarding.progressPercentage) || 0,
      totalTasks: onboarding.totalTasks,
      completedTasks: onboarding.completedTasks,
      byCategory: byType,
    };
  }

  // ── Access Company Handbook & Policies ──────────────────────────────
  async getPolicies(orgId: string, employeeId: string) {
    await this.getOnboarding(orgId, employeeId);

    const policyTasks = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.employeeId, employeeId),
          eq(schema.employeeOnboardingTasks.taskType, 'policy_acknowledgement'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      );

    const policyDocs = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.category, 'letters'),
        ),
      )
      .orderBy(desc(schema.documents.createdAt))
      .limit(50);

    return {
      policyTasks: policyTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        attachments: t.attachments,
      })),
      companyDocuments: policyDocs.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        category: d.category,
        fileUrl: d.fileUrl,
      })),
    };
  }
}
