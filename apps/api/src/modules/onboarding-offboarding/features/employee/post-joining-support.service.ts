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
export class PostJoiningSupportService {
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

  // ── 30-60-90 Day Check-In Schedule ──────────────────────────────────
  async getCheckins(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);
    const schedule = (onboarding.checkinSchedule as Array<Record<string, any>>) || [];

    return {
      onboardingId: onboarding.id,
      checkins: schedule.map((c, i) => ({
        index: i,
        dayMark: c.dayMark || `Day ${(i + 1) * 30}`,
        scheduledDate: c.scheduledDate || null,
        status: c.status || 'upcoming',
        completedAt: c.completedAt || null,
        feedbackSubmitted: c.feedbackSubmitted || false,
        managerNotes: c.managerNotes || null,
        employeeFeedback: c.employeeFeedback || null,
      })),
    };
  }

  // ── Submit Feedback at Check-In Point ───────────────────────────────
  async submitCheckinFeedback(orgId: string, employeeId: string, checkinIndex: string, data: Record<string, any>) {
    const onboarding = await this.getOnboarding(orgId, employeeId);
    const schedule = (onboarding.checkinSchedule as Array<Record<string, any>>) || [];

    const idx = parseInt(checkinIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= schedule.length) {
      throw new NotFoundException('Check-in point not found');
    }

    schedule[idx].employeeFeedback = {
      rating: data.rating || null,
      comments: data.comments || null,
      challenges: data.challenges || null,
      suggestions: data.suggestions || null,
      submittedAt: new Date().toISOString(),
    };
    schedule[idx].feedbackSubmitted = true;
    schedule[idx].status = 'completed';
    schedule[idx].completedAt = new Date().toISOString();

    await this.db
      .update(schema.employeeOnboardings)
      .set({ checkinSchedule: schedule, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, onboarding.id));

    return {
      checkinIndex: idx,
      status: 'completed',
      message: 'Check-in feedback submitted',
    };
  }

  // ── Request Additional Training ─────────────────────────────────────
  async requestTraining(orgId: string, employeeId: string, data: Record<string, any>) {
    const onboarding = await this.getOnboarding(orgId, employeeId);

    const [task] = await this.db
      .insert(schema.employeeOnboardingTasks)
      .values({
        orgId,
        onboardingId: onboarding.id,
        employeeId,
        title: data.title || 'Training Request',
        description: data.description || null,
        taskType: 'training',
        taskOwner: 'hr',
        status: 'pending',
        dueDate: data.preferredDate || null,
        notes: data.reason || null,
        metadata: {
          requestType: 'additional_training',
          trainingType: data.trainingType || 'general',
          requestedAt: new Date().toISOString(),
        },
      })
      .returning();

    return {
      requestId: task.id,
      title: task.title,
      status: task.status,
      message: 'Training request submitted',
      createdAt: task.createdAt.toISOString(),
    };
  }

  // ── Submit Question for HR ──────────────────────────────────────────
  async submitHrQuestion(orgId: string, employeeId: string, data: Record<string, any>) {
    if (!data.question) {
      throw new BadRequestException('Question is required');
    }

    const onboarding = await this.getOnboarding(orgId, employeeId);

    const [task] = await this.db
      .insert(schema.employeeOnboardingTasks)
      .values({
        orgId,
        onboardingId: onboarding.id,
        employeeId,
        title: data.subject || 'HR Question',
        description: data.question,
        taskType: 'general',
        taskOwner: 'hr',
        status: 'pending',
        metadata: {
          requestType: 'hr_question',
          category: data.category || 'general',
          submittedAt: new Date().toISOString(),
        },
      })
      .returning();

    return {
      questionId: task.id,
      subject: task.title,
      status: task.status,
      message: 'Question submitted to HR',
      createdAt: task.createdAt.toISOString(),
    };
  }

  // ── View Benefits Enrollment Status ─────────────────────────────────
  async getBenefitsStatus(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);
    const meta = (onboarding.metadata as Record<string, any>) || {};

    const benefitTasks = await this.db
      .select()
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.onboardingId, onboarding.id),
          eq(schema.employeeOnboardingTasks.taskType, 'general'),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      );

    const benefitRelated = benefitTasks.filter((t) => {
      const taskMeta = (t.metadata as Record<string, any>) || {};
      return taskMeta.requestType === 'benefits_enrollment';
    });

    return {
      onboardingId: onboarding.id,
      benefitsEnrollment: meta.benefitsEnrollment || {
        status: 'pending',
        enrolledPlans: [],
      },
      relatedTasks: benefitRelated.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
      })),
    };
  }

  // ── Submit IT Support Request ───────────────────────────────────────
  async submitItSupportRequest(orgId: string, employeeId: string, data: Record<string, any>) {
    if (!data.issue && !data.request) {
      throw new BadRequestException('Issue description or request is required');
    }

    const onboarding = await this.getOnboarding(orgId, employeeId);

    const [task] = await this.db
      .insert(schema.employeeOnboardingTasks)
      .values({
        orgId,
        onboardingId: onboarding.id,
        employeeId,
        title: data.subject || 'IT Support Request',
        description: data.issue || data.request,
        taskType: 'general',
        taskOwner: 'hr',
        status: 'pending',
        metadata: {
          requestType: 'it_support',
          category: data.category || 'access',
          priority: data.priority || 'normal',
          tools: data.tools || [],
          software: data.software || [],
          submittedAt: new Date().toISOString(),
        },
      })
      .returning();

    return {
      requestId: task.id,
      title: task.title,
      status: task.status,
      message: 'IT support request submitted',
      createdAt: task.createdAt.toISOString(),
    };
  }

  // ── View Workspace/Seating Information ──────────────────────────────
  async getWorkspaceInfo(orgId: string, employeeId: string) {
    const onboarding = await this.getOnboarding(orgId, employeeId);
    const firstDay = (onboarding.firstDayInfo as Record<string, any>) || {};

    return {
      onboardingId: onboarding.id,
      workspace: {
        building: firstDay.building || null,
        floor: firstDay.floor || null,
        desk: firstDay.desk || null,
        section: firstDay.section || null,
        parking: firstDay.parking || null,
        wifi: firstDay.wifi || null,
        facilities: firstDay.facilities || [],
      },
    };
  }

  // ── Get Company Calendar & Important Dates ──────────────────────────
  async getCompanyCalendar(orgId: string, employeeId: string) {
    await this.getOnboarding(orgId, employeeId);

    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(eq(schema.holidayCalendars.orgId, orgId))
      .orderBy(schema.holidayCalendars.createdAt)
      .limit(5);

    const calendarEvents: Array<Record<string, any>> = [];

    for (const hol of holidays) {
      calendarEvents.push({
        type: 'holiday',
        name: hol.name || 'Holiday',
        date: hol.date || null,
        description: hol.description || null,
        isOptional: hol.isOptional || false,
      });
    }

    return {
      events: calendarEvents,
      totalHolidays: calendarEvents.length,
    };
  }
}
