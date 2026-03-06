import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class InterviewMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private toDto(interview: Record<string, any>) {
    return {
      ...interview,
      overallScore: interview.overallScore ? Number(interview.overallScore) : null,
      scheduledAt: interview.scheduledAt?.toISOString?.() ?? interview.scheduledAt ?? null,
      decisionAt: interview.decisionAt?.toISOString?.() ?? interview.decisionAt ?? null,
      createdAt: interview.createdAt?.toISOString?.() ?? interview.createdAt,
      updatedAt: interview.updatedAt?.toISOString?.() ?? interview.updatedAt,
    };
  }

  private isPanelMember(panelMembers: any, managerId: string): boolean {
    if (!Array.isArray(panelMembers)) return false;
    return panelMembers.some(
      (member: any) => member.userId === managerId || member.id === managerId,
    );
  }

  async listUpcomingInterviews(orgId: string, managerId: string) {
    const now = new Date();

    // Get all interviews for this org, then filter by panel membership in app code
    const interviews = await this.db
      .select({
        id: schema.interviews.id,
        applicationId: schema.interviews.applicationId,
        stageId: schema.interviews.stageId,
        candidateId: schema.interviews.candidateId,
        scheduledAt: schema.interviews.scheduledAt,
        duration: schema.interviews.duration,
        location: schema.interviews.location,
        interviewType: schema.interviews.interviewType,
        panelMembers: schema.interviews.panelMembers,
        status: schema.interviews.status,
        overallScore: schema.interviews.overallScore,
        decision: schema.interviews.decision,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        candidateCurrentTitle: schema.candidates.currentTitle,
        candidateCurrentCompany: schema.candidates.currentCompany,
        stageName: schema.recruitmentPipelineStages.name,
        createdAt: schema.interviews.createdAt,
        updatedAt: schema.interviews.updatedAt,
      })
      .from(schema.interviews)
      .innerJoin(schema.candidates, eq(schema.interviews.candidateId, schema.candidates.id))
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.interviews.orgId, orgId),
          gte(schema.interviews.scheduledAt, now),
        ),
      )
      .orderBy(schema.interviews.scheduledAt);

    // Filter by panel membership in app code (small result set for team-scoped access)
    const managerInterviews = interviews.filter((interview) =>
      this.isPanelMember(interview.panelMembers, managerId),
    );

    return {
      data: managerInterviews.map((interview) => ({
        ...this.toDto(interview),
        candidateName: `${interview.candidateFirstName} ${interview.candidateLastName ?? ''}`.trim(),
        candidateEmail: interview.candidateEmail,
        candidateCurrentTitle: interview.candidateCurrentTitle,
        candidateCurrentCompany: interview.candidateCurrentCompany,
        stageName: interview.stageName,
      })),
      total: managerInterviews.length,
    };
  }

  async getInterviewDetail(orgId: string, managerId: string, interviewId: string) {
    const [interview] = await this.db
      .select({
        id: schema.interviews.id,
        applicationId: schema.interviews.applicationId,
        stageId: schema.interviews.stageId,
        candidateId: schema.interviews.candidateId,
        scheduledAt: schema.interviews.scheduledAt,
        duration: schema.interviews.duration,
        location: schema.interviews.location,
        interviewType: schema.interviews.interviewType,
        panelMembers: schema.interviews.panelMembers,
        status: schema.interviews.status,
        feedback: schema.interviews.feedback,
        overallScore: schema.interviews.overallScore,
        decision: schema.interviews.decision,
        decisionBy: schema.interviews.decisionBy,
        decisionAt: schema.interviews.decisionAt,
        notes: schema.interviews.notes,
        rescheduleCount: schema.interviews.rescheduleCount,
        cancelReason: schema.interviews.cancelReason,
        calendarEventId: schema.interviews.calendarEventId,
        metadata: schema.interviews.metadata,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        candidatePhone: schema.candidates.phone,
        candidateCurrentTitle: schema.candidates.currentTitle,
        candidateCurrentCompany: schema.candidates.currentCompany,
        candidateExperience: schema.candidates.experienceYears,
        candidateSkills: schema.candidates.skills,
        candidateResumeUrl: schema.candidates.resumeUrl,
        candidateLinkedinUrl: schema.candidates.linkedinUrl,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        evaluationCriteria: schema.recruitmentPipelineStages.evaluationCriteria,
        scorecardTemplate: schema.recruitmentPipelineStages.scorecardTemplate,
        createdAt: schema.interviews.createdAt,
        updatedAt: schema.interviews.updatedAt,
      })
      .from(schema.interviews)
      .innerJoin(schema.candidates, eq(schema.interviews.candidateId, schema.candidates.id))
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.interviews.id, interviewId),
          eq(schema.interviews.orgId, orgId),
        ),
      );

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (!this.isPanelMember(interview.panelMembers, managerId)) {
      throw new NotFoundException('Interview not found or access denied');
    }

    return {
      ...this.toDto(interview),
      candidateName: `${interview.candidateFirstName} ${interview.candidateLastName ?? ''}`.trim(),
      candidateEmail: interview.candidateEmail,
      candidatePhone: interview.candidatePhone,
      candidateCurrentTitle: interview.candidateCurrentTitle,
      candidateCurrentCompany: interview.candidateCurrentCompany,
      candidateExperience: interview.candidateExperience ? Number(interview.candidateExperience) : null,
      candidateSkills: interview.candidateSkills,
      candidateResumeUrl: interview.candidateResumeUrl,
      candidateLinkedinUrl: interview.candidateLinkedinUrl,
      stageName: interview.stageName,
      stageType: interview.stageType,
      evaluationCriteria: interview.evaluationCriteria,
      scorecardTemplate: interview.scorecardTemplate,
    };
  }

  async submitFeedback(orgId: string, managerId: string, interviewId: string, body: Record<string, any>) {
    const [interview] = await this.db
      .select({
        id: schema.interviews.id,
        panelMembers: schema.interviews.panelMembers,
        feedback: schema.interviews.feedback,
        status: schema.interviews.status,
      })
      .from(schema.interviews)
      .where(
        and(
          eq(schema.interviews.id, interviewId),
          eq(schema.interviews.orgId, orgId),
        ),
      );

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (!this.isPanelMember(interview.panelMembers, managerId)) {
      throw new NotFoundException('Interview not found or access denied');
    }

    if (interview.status === 'cancelled') {
      throw new BadRequestException('Cannot submit feedback for a cancelled interview');
    }

    // Build feedback entry
    const feedbackEntry = {
      reviewerId: managerId,
      scores: body.scores ?? [],
      overallScore: body.overallScore ?? null,
      decision: body.decision ?? null,
      strengths: body.strengths ?? null,
      weaknesses: body.weaknesses ?? null,
      notes: body.notes ?? null,
      submittedAt: new Date().toISOString(),
    };

    // Update feedback — merge into existing feedback object
    const existingFeedback = (interview.feedback as Record<string, any>) ?? {};
    const panelFeedback = existingFeedback.panelFeedback ?? [];

    // Remove any existing feedback from this manager and add the new one
    const updatedPanelFeedback = [
      ...panelFeedback.filter((f: any) => f.reviewerId !== managerId),
      feedbackEntry,
    ];

    const updatedFeedback = {
      ...existingFeedback,
      panelFeedback: updatedPanelFeedback,
    };

    // Calculate average overall score from all panel feedback
    const scoredFeedback = updatedPanelFeedback.filter((f: any) => f.overallScore != null);
    const avgScore = scoredFeedback.length > 0
      ? scoredFeedback.reduce((acc: number, f: any) => acc + Number(f.overallScore), 0) / scoredFeedback.length
      : null;

    await this.db
      .update(schema.interviews)
      .set({
        feedback: updatedFeedback,
        overallScore: avgScore?.toString() ?? null,
        status: interview.status === 'scheduled' ? 'completed' : interview.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.interviews.id, interviewId));

    return { message: 'Feedback submitted successfully', feedback: feedbackEntry };
  }

  async getPanelFeedback(orgId: string, managerId: string, interviewId: string) {
    const [interview] = await this.db
      .select({
        id: schema.interviews.id,
        panelMembers: schema.interviews.panelMembers,
        feedback: schema.interviews.feedback,
        overallScore: schema.interviews.overallScore,
        decision: schema.interviews.decision,
      })
      .from(schema.interviews)
      .where(
        and(
          eq(schema.interviews.id, interviewId),
          eq(schema.interviews.orgId, orgId),
        ),
      );

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (!this.isPanelMember(interview.panelMembers, managerId)) {
      throw new NotFoundException('Interview not found or access denied');
    }

    // Check that the manager has already submitted their own feedback
    const feedbackData = (interview.feedback as Record<string, any>) ?? {};
    const panelFeedback: any[] = feedbackData.panelFeedback ?? [];

    const ownFeedback = panelFeedback.find((f: any) => f.reviewerId === managerId);
    if (!ownFeedback) {
      throw new BadRequestException('You must submit your own feedback before viewing others');
    }

    // Get reviewer names
    const reviewerIds = panelFeedback.map((f: any) => f.reviewerId).filter(Boolean);
    let reviewerNames = new Map<string, string>();
    if (reviewerIds.length > 0) {
      const users = await this.db
        .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(sql`${schema.users.id} = ANY(${reviewerIds})`);

      for (const user of users) {
        reviewerNames.set(user.id, `${user.firstName} ${user.lastName ?? ''}`.trim());
      }
    }

    return {
      interviewId,
      overallScore: interview.overallScore ? Number(interview.overallScore) : null,
      decision: interview.decision,
      panelFeedback: panelFeedback.map((f: any) => ({
        ...f,
        reviewerName: reviewerNames.get(f.reviewerId) ?? 'Unknown',
      })),
    };
  }

  async setDecision(orgId: string, managerId: string, interviewId: string, body: Record<string, any>) {
    const [interview] = await this.db
      .select({
        id: schema.interviews.id,
        panelMembers: schema.interviews.panelMembers,
        status: schema.interviews.status,
      })
      .from(schema.interviews)
      .where(
        and(
          eq(schema.interviews.id, interviewId),
          eq(schema.interviews.orgId, orgId),
        ),
      );

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (!this.isPanelMember(interview.panelMembers, managerId)) {
      throw new NotFoundException('Interview not found or access denied');
    }

    const validDecisions = ['strong_hire', 'hire', 'no_hire', 'strong_no_hire', 'next_round'];
    if (!body.decision || !validDecisions.includes(body.decision)) {
      throw new BadRequestException(
        `Invalid decision. Must be one of: ${validDecisions.join(', ')}`,
      );
    }

    await this.db
      .update(schema.interviews)
      .set({
        decision: body.decision,
        decisionBy: managerId,
        decisionAt: new Date(),
        notes: body.notes ?? interview.status,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(schema.interviews.id, interviewId));

    return { message: 'Decision recorded successfully', decision: body.decision };
  }
}
