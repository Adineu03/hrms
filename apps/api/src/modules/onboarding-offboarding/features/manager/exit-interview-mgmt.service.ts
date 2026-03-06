import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ExitInterviewMgmtService {
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

  async listExitInterviews(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.exitInterviews.id,
        employeeId: schema.exitInterviews.employeeId,
        offboardingId: schema.exitInterviews.offboardingId,
        interviewerId: schema.exitInterviews.interviewerId,
        scheduledAt: schema.exitInterviews.scheduledAt,
        completedAt: schema.exitInterviews.completedAt,
        status: schema.exitInterviews.status,
        sentiment: schema.exitInterviews.sentiment,
        overallRating: schema.exitInterviews.overallRating,
        themes: schema.exitInterviews.themes,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.exitInterviews.createdAt,
      })
      .from(schema.exitInterviews)
      .innerJoin(schema.users, eq(schema.exitInterviews.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.exitInterviews.orgId, orgId),
          inArray(schema.exitInterviews.employeeId, teamIds),
          eq(schema.exitInterviews.isActive, true),
        ),
      )
      .orderBy(desc(schema.exitInterviews.createdAt));

    // Fetch interviewer names
    const interviewerIds = rows.map((r) => r.interviewerId).filter(Boolean) as string[];
    let interviewerMap = new Map<string, string>();
    if (interviewerIds.length > 0) {
      const interviewers = await this.db
        .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(inArray(schema.users.id, interviewerIds));
      for (const i of interviewers) {
        interviewerMap.set(i.id, `${i.firstName} ${i.lastName ?? ''}`.trim());
      }
    }

    return {
      data: rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        employeeEmail: r.email,
        offboardingId: r.offboardingId,
        interviewerId: r.interviewerId,
        interviewerName: r.interviewerId ? (interviewerMap.get(r.interviewerId) ?? 'Unknown') : null,
        scheduledAt: r.scheduledAt?.toISOString?.() ?? null,
        completedAt: r.completedAt?.toISOString?.() ?? null,
        status: r.status,
        sentiment: r.sentiment,
        overallRating: r.overallRating,
        themeCount: Array.isArray(r.themes) ? (r.themes as any[]).length : 0,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      total: rows.length,
    };
  }

  async scheduleInterview(orgId: string, managerId: string, body: Record<string, any>) {
    if (!body.employeeId) throw new BadRequestException('employeeId is required');
    if (!body.scheduledAt) throw new BadRequestException('scheduledAt is required');

    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(body.employeeId)) {
      throw new NotFoundException('Employee not found in your team');
    }

    // Check if employee has an active offboarding
    let offboardingId: string | null = body.offboardingId ?? null;
    if (!offboardingId) {
      const [offboarding] = await this.db
        .select({ id: schema.employeeOffboardings.id })
        .from(schema.employeeOffboardings)
        .where(
          and(
            eq(schema.employeeOffboardings.orgId, orgId),
            eq(schema.employeeOffboardings.employeeId, body.employeeId),
            eq(schema.employeeOffboardings.isActive, true),
          ),
        )
        .orderBy(desc(schema.employeeOffboardings.createdAt))
        .limit(1);
      offboardingId = offboarding?.id ?? null;
    }

    const [interview] = await this.db
      .insert(schema.exitInterviews)
      .values({
        orgId,
        employeeId: body.employeeId,
        offboardingId,
        interviewerId: body.interviewerId ?? managerId,
        scheduledAt: new Date(body.scheduledAt),
        questionnaire: body.questionnaire ?? [],
        status: 'scheduled',
      })
      .returning();

    return { message: 'Exit interview scheduled', data: interview };
  }

  async getInterviewDetail(orgId: string, managerId: string, interviewId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [row] = await this.db
      .select({
        id: schema.exitInterviews.id,
        employeeId: schema.exitInterviews.employeeId,
        offboardingId: schema.exitInterviews.offboardingId,
        interviewerId: schema.exitInterviews.interviewerId,
        scheduledAt: schema.exitInterviews.scheduledAt,
        completedAt: schema.exitInterviews.completedAt,
        questionnaire: schema.exitInterviews.questionnaire,
        responses: schema.exitInterviews.responses,
        themes: schema.exitInterviews.themes,
        sentiment: schema.exitInterviews.sentiment,
        overallRating: schema.exitInterviews.overallRating,
        rehireEligible: schema.exitInterviews.rehireEligible,
        rehireNotes: schema.exitInterviews.rehireNotes,
        exitReasons: schema.exitInterviews.exitReasons,
        improvements: schema.exitInterviews.improvements,
        notes: schema.exitInterviews.notes,
        status: schema.exitInterviews.status,
        metadata: schema.exitInterviews.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.exitInterviews.createdAt,
        updatedAt: schema.exitInterviews.updatedAt,
      })
      .from(schema.exitInterviews)
      .innerJoin(schema.users, eq(schema.exitInterviews.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.exitInterviews.id, interviewId),
          eq(schema.exitInterviews.orgId, orgId),
          eq(schema.exitInterviews.isActive, true),
        ),
      );

    if (!row || !teamIds.includes(row.employeeId)) {
      throw new NotFoundException('Exit interview not found');
    }

    return {
      ...row,
      employeeName: `${row.firstName} ${row.lastName ?? ''}`.trim(),
      scheduledAt: row.scheduledAt?.toISOString?.() ?? null,
      completedAt: row.completedAt?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  async updateInterview(orgId: string, managerId: string, interviewId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [existing] = await this.db
      .select({ id: schema.exitInterviews.id, employeeId: schema.exitInterviews.employeeId, status: schema.exitInterviews.status })
      .from(schema.exitInterviews)
      .where(
        and(
          eq(schema.exitInterviews.id, interviewId),
          eq(schema.exitInterviews.orgId, orgId),
        ),
      );

    if (!existing || !teamIds.includes(existing.employeeId)) {
      throw new NotFoundException('Exit interview not found');
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.scheduledAt !== undefined) updates.scheduledAt = new Date(body.scheduledAt);
    if (body.interviewerId !== undefined) updates.interviewerId = body.interviewerId;
    if (body.questionnaire !== undefined) updates.questionnaire = body.questionnaire;
    if (body.responses !== undefined) updates.responses = body.responses;
    if (body.themes !== undefined) updates.themes = body.themes;
    if (body.sentiment !== undefined) updates.sentiment = body.sentiment;
    if (body.overallRating !== undefined) updates.overallRating = body.overallRating;
    if (body.exitReasons !== undefined) updates.exitReasons = body.exitReasons;
    if (body.improvements !== undefined) updates.improvements = body.improvements;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.rehireEligible !== undefined) updates.rehireEligible = body.rehireEligible;
    if (body.rehireNotes !== undefined) updates.rehireNotes = body.rehireNotes;

    await this.db
      .update(schema.exitInterviews)
      .set(updates)
      .where(eq(schema.exitInterviews.id, interviewId));

    return { message: 'Exit interview updated', interviewId };
  }

  async completeInterview(orgId: string, managerId: string, interviewId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [existing] = await this.db
      .select({ id: schema.exitInterviews.id, employeeId: schema.exitInterviews.employeeId, status: schema.exitInterviews.status })
      .from(schema.exitInterviews)
      .where(
        and(
          eq(schema.exitInterviews.id, interviewId),
          eq(schema.exitInterviews.orgId, orgId),
        ),
      );

    if (!existing || !teamIds.includes(existing.employeeId)) {
      throw new NotFoundException('Exit interview not found');
    }

    if (existing.status === 'completed') {
      throw new BadRequestException('Interview already completed');
    }

    const updates: Record<string, any> = {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    if (body.responses !== undefined) updates.responses = body.responses;
    if (body.themes !== undefined) updates.themes = body.themes;
    if (body.sentiment !== undefined) updates.sentiment = body.sentiment;
    if (body.overallRating !== undefined) updates.overallRating = body.overallRating;
    if (body.exitReasons !== undefined) updates.exitReasons = body.exitReasons;
    if (body.improvements !== undefined) updates.improvements = body.improvements;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.rehireEligible !== undefined) updates.rehireEligible = body.rehireEligible;
    if (body.rehireNotes !== undefined) updates.rehireNotes = body.rehireNotes;

    await this.db
      .update(schema.exitInterviews)
      .set(updates)
      .where(eq(schema.exitInterviews.id, interviewId));

    return { message: 'Exit interview completed', interviewId };
  }

  async getFeedbackThemes(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { themes: [], totalInterviews: 0 };

    const interviews = await this.db
      .select({
        id: schema.exitInterviews.id,
        themes: schema.exitInterviews.themes,
        sentiment: schema.exitInterviews.sentiment,
        exitReasons: schema.exitInterviews.exitReasons,
        overallRating: schema.exitInterviews.overallRating,
      })
      .from(schema.exitInterviews)
      .where(
        and(
          eq(schema.exitInterviews.orgId, orgId),
          inArray(schema.exitInterviews.employeeId, teamIds),
          eq(schema.exitInterviews.isActive, true),
          eq(schema.exitInterviews.status, 'completed'),
        ),
      );

    // Aggregate themes
    const themeCount = new Map<string, number>();
    const reasonCount = new Map<string, number>();
    const sentimentCount = new Map<string, number>();

    for (const interview of interviews) {
      const themes = Array.isArray(interview.themes) ? (interview.themes as any[]) : [];
      for (const theme of themes) {
        const name = typeof theme === 'string' ? theme : (theme.name ?? theme.label ?? 'unknown');
        themeCount.set(name, (themeCount.get(name) ?? 0) + 1);
      }

      const reasons = Array.isArray(interview.exitReasons) ? (interview.exitReasons as any[]) : [];
      for (const reason of reasons) {
        const name = typeof reason === 'string' ? reason : (reason.name ?? reason.label ?? 'unknown');
        reasonCount.set(name, (reasonCount.get(name) ?? 0) + 1);
      }

      if (interview.sentiment) {
        sentimentCount.set(interview.sentiment, (sentimentCount.get(interview.sentiment) ?? 0) + 1);
      }
    }

    const sortedThemes = Array.from(themeCount.entries())
      .map(([theme, count]) => ({ theme, count, percentage: Math.round((count / interviews.length) * 10000) / 100 }))
      .sort((a, b) => b.count - a.count);

    const sortedReasons = Array.from(reasonCount.entries())
      .map(([reason, count]) => ({ reason, count, percentage: Math.round((count / interviews.length) * 10000) / 100 }))
      .sort((a, b) => b.count - a.count);

    const sentimentBreakdown = Object.fromEntries(sentimentCount);

    return {
      totalInterviews: interviews.length,
      themes: sortedThemes,
      exitReasons: sortedReasons,
      sentimentBreakdown,
    };
  }
}
