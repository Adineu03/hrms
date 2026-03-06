import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CandidateReviewService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getManagerRequisitionIds(orgId: string, managerId: string): Promise<string[]> {
    const reqs = await this.db
      .select({ id: schema.jobRequisitions.id })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.createdBy, managerId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      );
    return reqs.map((r) => r.id);
  }

  private toApplicationDto(app: Record<string, any>) {
    return {
      ...app,
      overallScore: app.overallScore ? Number(app.overallScore) : null,
      candidateExperience: app.candidateExperience ? Number(app.candidateExperience) : null,
      candidateSalaryExpectation: app.candidateSalaryExpectation ? Number(app.candidateSalaryExpectation) : null,
      appliedAt: app.appliedAt?.toISOString?.() ?? app.appliedAt,
      createdAt: app.createdAt?.toISOString?.() ?? app.createdAt,
      updatedAt: app.updatedAt?.toISOString?.() ?? app.updatedAt,
    };
  }

  async listShortlistedCandidates(orgId: string, managerId: string) {
    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);

    if (reqIds.length === 0) {
      return { data: [], total: 0 };
    }

    const applications = await this.db
      .select({
        id: schema.applications.id,
        candidateId: schema.applications.candidateId,
        jobPostingId: schema.applications.jobPostingId,
        requisitionId: schema.applications.requisitionId,
        source: schema.applications.source,
        currentStageId: schema.applications.currentStageId,
        status: schema.applications.status,
        overallScore: schema.applications.overallScore,
        resumeUrl: schema.applications.resumeUrl,
        appliedAt: schema.applications.appliedAt,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        candidatePhone: schema.candidates.phone,
        candidateCurrentTitle: schema.candidates.currentTitle,
        candidateCurrentCompany: schema.candidates.currentCompany,
        candidateExperience: schema.candidates.experienceYears,
        candidateSkills: schema.candidates.skills,
        candidateSalaryExpectation: schema.candidates.salaryExpectation,
        requisitionTitle: schema.jobRequisitions.title,
        stageName: schema.recruitmentPipelineStages.name,
        createdAt: schema.applications.createdAt,
        updatedAt: schema.applications.updatedAt,
      })
      .from(schema.applications)
      .innerJoin(schema.candidates, eq(schema.applications.candidateId, schema.candidates.id))
      .innerJoin(schema.jobRequisitions, eq(schema.applications.requisitionId, schema.jobRequisitions.id))
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.applications.currentStageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          inArray(schema.applications.requisitionId, reqIds),
          eq(schema.applications.isActive, true),
        ),
      )
      .orderBy(desc(schema.applications.createdAt));

    return {
      data: applications.map((app) => ({
        ...this.toApplicationDto(app),
        candidateName: `${app.candidateFirstName} ${app.candidateLastName ?? ''}`.trim(),
      })),
      total: applications.length,
    };
  }

  async getCandidateDetail(orgId: string, managerId: string, applicationId: string) {
    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);

    if (reqIds.length === 0) {
      throw new NotFoundException('Application not found or access denied');
    }

    const [application] = await this.db
      .select({
        id: schema.applications.id,
        candidateId: schema.applications.candidateId,
        jobPostingId: schema.applications.jobPostingId,
        requisitionId: schema.applications.requisitionId,
        source: schema.applications.source,
        referralId: schema.applications.referralId,
        coverLetter: schema.applications.coverLetter,
        resumeUrl: schema.applications.resumeUrl,
        currentStageId: schema.applications.currentStageId,
        status: schema.applications.status,
        overallScore: schema.applications.overallScore,
        feedback: schema.applications.feedback,
        metadata: schema.applications.metadata,
        appliedAt: schema.applications.appliedAt,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        candidatePhone: schema.candidates.phone,
        candidateCurrentTitle: schema.candidates.currentTitle,
        candidateCurrentCompany: schema.candidates.currentCompany,
        candidateExperience: schema.candidates.experienceYears,
        candidateSkills: schema.candidates.skills,
        candidateEducation: schema.candidates.education,
        candidateResumeUrl: schema.candidates.resumeUrl,
        candidateLinkedinUrl: schema.candidates.linkedinUrl,
        candidatePortfolioUrl: schema.candidates.portfolioUrl,
        candidateSalaryExpectation: schema.candidates.salaryExpectation,
        candidateCurrency: schema.candidates.currency,
        candidateNoticePeriod: schema.candidates.noticePeriodDays,
        candidateCurrentLocation: schema.candidates.currentLocation,
        candidatePreferredLocations: schema.candidates.preferredLocations,
        candidateTags: schema.candidates.tags,
        requisitionTitle: schema.jobRequisitions.title,
        stageName: schema.recruitmentPipelineStages.name,
        createdAt: schema.applications.createdAt,
        updatedAt: schema.applications.updatedAt,
      })
      .from(schema.applications)
      .innerJoin(schema.candidates, eq(schema.applications.candidateId, schema.candidates.id))
      .innerJoin(schema.jobRequisitions, eq(schema.applications.requisitionId, schema.jobRequisitions.id))
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.applications.currentStageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.applications.id, applicationId),
          eq(schema.applications.orgId, orgId),
          inArray(schema.applications.requisitionId, reqIds),
        ),
      );

    if (!application) {
      throw new NotFoundException('Application not found or access denied');
    }

    // Get all interviews with scores for this application
    const interviews = await this.db
      .select({
        id: schema.interviews.id,
        stageId: schema.interviews.stageId,
        scheduledAt: schema.interviews.scheduledAt,
        duration: schema.interviews.duration,
        interviewType: schema.interviews.interviewType,
        panelMembers: schema.interviews.panelMembers,
        status: schema.interviews.status,
        feedback: schema.interviews.feedback,
        overallScore: schema.interviews.overallScore,
        decision: schema.interviews.decision,
        decisionAt: schema.interviews.decisionAt,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
      })
      .from(schema.interviews)
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.interviews.applicationId, applicationId),
          eq(schema.interviews.orgId, orgId),
        ),
      )
      .orderBy(schema.interviews.scheduledAt);

    return {
      ...this.toApplicationDto(application),
      candidateName: `${application.candidateFirstName} ${application.candidateLastName ?? ''}`.trim(),
      interviews: interviews.map((i) => ({
        id: i.id,
        stageId: i.stageId,
        stageName: i.stageName,
        stageType: i.stageType,
        scheduledAt: i.scheduledAt?.toISOString?.() ?? i.scheduledAt,
        duration: i.duration,
        interviewType: i.interviewType,
        panelMembers: i.panelMembers,
        status: i.status,
        feedback: i.feedback,
        overallScore: i.overallScore ? Number(i.overallScore) : null,
        decision: i.decision,
        decisionAt: i.decisionAt?.toISOString?.() ?? i.decisionAt ?? null,
      })),
    };
  }

  async compareCandidates(orgId: string, managerId: string, body: Record<string, any>) {
    const applicationIds: string[] = body.applicationIds;
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length < 2) {
      throw new BadRequestException('At least 2 application IDs are required for comparison');
    }

    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);
    if (reqIds.length === 0) {
      throw new NotFoundException('No requisitions found for this manager');
    }

    const applications = await this.db
      .select({
        id: schema.applications.id,
        requisitionId: schema.applications.requisitionId,
        status: schema.applications.status,
        overallScore: schema.applications.overallScore,
        source: schema.applications.source,
        appliedAt: schema.applications.appliedAt,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        candidateCurrentTitle: schema.candidates.currentTitle,
        candidateCurrentCompany: schema.candidates.currentCompany,
        candidateExperience: schema.candidates.experienceYears,
        candidateSkills: schema.candidates.skills,
        candidateEducation: schema.candidates.education,
        candidateSalaryExpectation: schema.candidates.salaryExpectation,
        candidateCurrency: schema.candidates.currency,
        candidateNoticePeriod: schema.candidates.noticePeriodDays,
        candidateCurrentLocation: schema.candidates.currentLocation,
        requisitionTitle: schema.jobRequisitions.title,
        stageName: schema.recruitmentPipelineStages.name,
      })
      .from(schema.applications)
      .innerJoin(schema.candidates, eq(schema.applications.candidateId, schema.candidates.id))
      .innerJoin(schema.jobRequisitions, eq(schema.applications.requisitionId, schema.jobRequisitions.id))
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.applications.currentStageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          inArray(schema.applications.id, applicationIds),
          inArray(schema.applications.requisitionId, reqIds),
        ),
      );

    // Get interview scores for each application
    const interviewScores = await this.db
      .select({
        applicationId: schema.interviews.applicationId,
        overallScore: schema.interviews.overallScore,
        decision: schema.interviews.decision,
        interviewType: schema.interviews.interviewType,
        stageName: schema.recruitmentPipelineStages.name,
      })
      .from(schema.interviews)
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.interviews.orgId, orgId),
          inArray(schema.interviews.applicationId, applicationIds),
        ),
      )
      .orderBy(schema.interviews.scheduledAt);

    // Group interview scores by application
    const scoreMap = new Map<string, any[]>();
    for (const score of interviewScores) {
      if (!scoreMap.has(score.applicationId)) {
        scoreMap.set(score.applicationId, []);
      }
      scoreMap.get(score.applicationId)!.push({
        stageName: score.stageName,
        interviewType: score.interviewType,
        overallScore: score.overallScore ? Number(score.overallScore) : null,
        decision: score.decision,
      });
    }

    const comparison = applications.map((app) => ({
      applicationId: app.id,
      candidateName: `${app.candidateFirstName} ${app.candidateLastName ?? ''}`.trim(),
      candidateEmail: app.candidateEmail,
      currentTitle: app.candidateCurrentTitle,
      currentCompany: app.candidateCurrentCompany,
      experience: app.candidateExperience ? Number(app.candidateExperience) : null,
      skills: app.candidateSkills,
      education: app.candidateEducation,
      salaryExpectation: app.candidateSalaryExpectation ? Number(app.candidateSalaryExpectation) : null,
      currency: app.candidateCurrency,
      noticePeriod: app.candidateNoticePeriod,
      currentLocation: app.candidateCurrentLocation,
      applicationStatus: app.status,
      overallScore: app.overallScore ? Number(app.overallScore) : null,
      currentStage: app.stageName,
      requisitionTitle: app.requisitionTitle,
      source: app.source,
      appliedAt: app.appliedAt?.toISOString?.() ?? app.appliedAt,
      interviewScores: scoreMap.get(app.id) ?? [],
    }));

    return {
      candidates: comparison,
      total: comparison.length,
    };
  }

  async addNote(orgId: string, managerId: string, applicationId: string, body: Record<string, any>) {
    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);
    if (reqIds.length === 0) {
      throw new NotFoundException('Application not found or access denied');
    }

    const [application] = await this.db
      .select({
        id: schema.applications.id,
        feedback: schema.applications.feedback,
        requisitionId: schema.applications.requisitionId,
      })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.id, applicationId),
          eq(schema.applications.orgId, orgId),
          inArray(schema.applications.requisitionId, reqIds),
        ),
      );

    if (!application) {
      throw new NotFoundException('Application not found or access denied');
    }

    const noteEntry = {
      authorId: managerId,
      content: body.content ?? body.note ?? '',
      type: body.type ?? 'general',
      createdAt: new Date().toISOString(),
    };

    const existingFeedback = (application.feedback as any[]) ?? [];
    const updatedFeedback = [...existingFeedback, noteEntry];

    await this.db
      .update(schema.applications)
      .set({
        feedback: updatedFeedback,
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, applicationId));

    return { message: 'Note added successfully', note: noteEntry };
  }

  async moveStage(orgId: string, managerId: string, applicationId: string, body: Record<string, any>) {
    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);
    if (reqIds.length === 0) {
      throw new NotFoundException('Application not found or access denied');
    }

    const [application] = await this.db
      .select({
        id: schema.applications.id,
        requisitionId: schema.applications.requisitionId,
        currentStageId: schema.applications.currentStageId,
        status: schema.applications.status,
        metadata: schema.applications.metadata,
      })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.id, applicationId),
          eq(schema.applications.orgId, orgId),
          inArray(schema.applications.requisitionId, reqIds),
        ),
      );

    if (!application) {
      throw new NotFoundException('Application not found or access denied');
    }

    if (application.status === 'rejected' || application.status === 'withdrawn') {
      throw new BadRequestException(`Cannot move candidate in ${application.status} status`);
    }

    const targetStageId = body.stageId;
    if (!targetStageId) {
      throw new BadRequestException('stageId is required');
    }

    // Verify the target stage exists and belongs to the same requisition
    const [targetStage] = await this.db
      .select({ id: schema.recruitmentPipelineStages.id, name: schema.recruitmentPipelineStages.name })
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.id, targetStageId),
          eq(schema.recruitmentPipelineStages.orgId, orgId),
          eq(schema.recruitmentPipelineStages.requisitionId, application.requisitionId),
          eq(schema.recruitmentPipelineStages.isActive, true),
        ),
      );

    if (!targetStage) {
      throw new NotFoundException('Target stage not found for this requisition');
    }

    // Record stage transition in metadata
    const existingMetadata = (application.metadata as Record<string, any>) ?? {};
    const stageHistory: any[] = existingMetadata.stageHistory ?? [];
    stageHistory.push({
      fromStageId: application.currentStageId,
      toStageId: targetStageId,
      movedBy: managerId,
      movedAt: new Date().toISOString(),
      reason: body.reason ?? null,
    });

    await this.db
      .update(schema.applications)
      .set({
        currentStageId: targetStageId,
        metadata: { ...existingMetadata, stageHistory },
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, applicationId));

    return {
      message: 'Candidate moved to new stage successfully',
      applicationId,
      newStageId: targetStageId,
      newStageName: targetStage.name,
    };
  }
}
