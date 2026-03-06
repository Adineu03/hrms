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
export class OrientationTrainingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Helper: Get onboarding record ───────────────────────────────────
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
      throw new NotFoundException('No active onboarding found');
    }
    return onboarding;
  }

  // ── View Scheduled Orientation Sessions ─────────────────────────────
  async getSessions(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);
    const schedule = (onboarding.orientationSchedule as Array<Record<string, any>>) || [];

    return {
      onboardingId: onboarding.id,
      sessions: schedule.map((s, i) => ({
        index: i,
        title: s.title || `Session ${i + 1}`,
        description: s.description || null,
        scheduledAt: s.scheduledAt || null,
        duration: s.duration || null,
        location: s.location || null,
        presenter: s.presenter || null,
        type: s.type || 'general',
        status: s.status || 'scheduled',
      })),
    };
  }

  // ── Access Training Materials ───────────────────────────────────────
  async getMaterials(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const trainingTasks = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.taskType, 'training'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .orderBy(schema.employeeOnboardingTasks.createdAt);

    return {
      onboardingId: onboarding.id,
      materials: trainingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        attachments: t.attachments,
        status: t.status,
        metadata: t.metadata,
      })),
    };
  }

  // ── List Assigned E-Learning Modules ────────────────────────────────
  async getModules(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const modules = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.taskType, 'training'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .orderBy(schema.employeeOnboardingTasks.createdAt);

    return {
      onboardingId: onboarding.id,
      total: modules.length,
      completed: modules.filter((m) => m.status === 'completed').length,
      modules: modules.map((m) => {
        const meta = (m.metadata as Record<string, any>) || {};
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          status: m.status,
          dueDate: m.dueDate,
          completedAt: m.completedAt?.toISOString() || null,
          moduleUrl: meta.moduleUrl || null,
          duration: meta.duration || null,
          quizRequired: meta.quizRequired || false,
          quizScore: meta.quizScore || null,
          certificate: meta.certificate || null,
        };
      }),
    };
  }

  // ── Complete an E-Learning Module ───────────────────────────────────
  async completeModule(orgId: string, employeeId: string, moduleId: string) {
    const [task] = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.id, moduleId),
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.employeeId, employeeId),
          eq(schema.employeeOnboardingTasks.taskType, 'training'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .limit(1);

    if (!task) {
      throw new NotFoundException('Training module not found');
    }

    if (task.status === 'completed') {
      throw new BadRequestException('Module is already completed');
    }

    const [updated] = await this.db
      .update(schema.employeeOnboardingTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completedBy: employeeId,
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeOnboardingTasks.id, moduleId))
      .returning();

    return {
      moduleId: updated.id,
      title: updated.title,
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() || null,
    };
  }

  // ── Submit Quiz/Assessment ──────────────────────────────────────────
  async submitQuiz(orgId: string, employeeId: string, moduleId: string, data: Record<string, any>) {
    const [task] = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.id, moduleId),
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.employeeId, employeeId),
          eq(schema.employeeOnboardingTasks.taskType, 'training'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .limit(1);

    if (!task) {
      throw new NotFoundException('Training module not found');
    }

    const meta = (task.metadata as Record<string, any>) || {};
    meta.quizResponses = data.answers || [];
    meta.quizScore = data.score || null;
    meta.quizSubmittedAt = new Date().toISOString();
    meta.quizPassed = data.score ? data.score >= (meta.passingScore || 70) : null;

    await this.db
      .update(schema.employeeOnboardingTasks)
      .set({ metadata: meta, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardingTasks.id, moduleId));

    return {
      moduleId,
      quizScore: meta.quizScore,
      quizPassed: meta.quizPassed,
      submittedAt: meta.quizSubmittedAt,
    };
  }

  // ── Track Training Completion Status ────────────────────────────────
  async getCompletionStatus(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const modules = await this.db
      .select({
        status: schema.employeeOnboardingTasks.status,
        taskType: schema.employeeOnboardingTasks.taskType,
      })
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.taskType, 'training'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      );

    const total = modules.length;
    const completed = modules.filter((m) => m.status === 'completed').length;
    const inProgress = modules.filter((m) => m.status === 'in_progress').length;
    const pending = modules.filter((m) => m.status === 'pending').length;

    return {
      onboardingId: onboarding.id,
      total,
      completed,
      inProgress,
      pending,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  // ── View Certificates ───────────────────────────────────────────────
  async getCertificates(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const completedModules = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.taskType, 'training'),
          eq(schema.employeeOnboardingTasks.status, 'completed'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .orderBy(desc(schema.employeeOnboardingTasks.completedAt));

    const certificates = completedModules
      .filter((m) => {
        const meta = (m.metadata as Record<string, any>) || {};
        return meta.certificate;
      })
      .map((m) => {
        const meta = (m.metadata as Record<string, any>) || {};
        return {
          moduleId: m.id,
          title: m.title,
          certificateUrl: meta.certificate?.url || null,
          issuedAt: meta.certificate?.issuedAt || m.completedAt?.toISOString() || null,
          expiresAt: meta.certificate?.expiresAt || null,
        };
      });

    return { certificates };
  }

  // ── Submit Feedback on Orientation ──────────────────────────────────
  async submitFeedback(orgId: string, employeeId: string, data: Record<string, any>) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const currentSurvey = (onboarding.onboardingSurvey as Record<string, any>) || {};
    currentSurvey.orientationFeedback = {
      rating: data.rating || null,
      comments: data.comments || null,
      suggestions: data.suggestions || null,
      submittedAt: new Date().toISOString(),
    };

    await this.db
      .update(schema.employeeOnboardings)
      .set({ onboardingSurvey: currentSurvey, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, onboarding.id));

    return { message: 'Orientation feedback submitted', onboardingId: onboarding.id };
  }

  // ── Resource Library ────────────────────────────────────────────────
  async getResources(orgId: string, employeeId: string) {
    await this.getOnboarding(orgId, employeeId);

    const resources = await this.db
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
      resources: resources.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        fileUrl: r.fileUrl,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
