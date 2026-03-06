import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyApplicationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── List My Internal Applications ─────────────────────────────────────
  async listApplications(orgId: string, employeeId: string) {
    const rows = await this.db
      .select({
        application: schema.applications,
        postingTitle: schema.jobPostings.title,
        postingStatus: schema.jobPostings.status,
        postingType: schema.jobPostings.postingType,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        departmentName: schema.departments.name,
      })
      .from(schema.applications)
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.applications.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.applications.currentStageId, schema.recruitmentPipelineStages.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.internalEmployeeId, employeeId),
          eq(schema.applications.isActive, true),
          sql`${schema.applications.status} NOT IN ('withdrawn', 'rejected')`,
        ),
      )
      .orderBy(desc(schema.applications.appliedAt));

    return {
      data: rows.map((r) => this.toApplicationListDto(r)),
      total: rows.length,
    };
  }

  // ── Get Application Detail ────────────────────────────────────────────
  async getApplicationDetail(orgId: string, employeeId: string, applicationId: string) {
    const [row] = await this.db
      .select({
        application: schema.applications,
        postingTitle: schema.jobPostings.title,
        postingDescription: schema.jobPostings.description,
        postingStatus: schema.jobPostings.status,
        postingType: schema.jobPostings.postingType,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        stageSortOrder: schema.recruitmentPipelineStages.sortOrder,
        departmentName: schema.departments.name,
        requisitionTitle: schema.jobRequisitions.title,
      })
      .from(schema.applications)
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.applications.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.applications.currentStageId, schema.recruitmentPipelineStages.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.applications.id, applicationId),
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.internalEmployeeId, employeeId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Application not found');
    }

    // Get all pipeline stages for this requisition to show progress
    const allStages = await this.db
      .select({
        id: schema.recruitmentPipelineStages.id,
        name: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        sortOrder: schema.recruitmentPipelineStages.sortOrder,
      })
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.orgId, orgId),
          eq(schema.recruitmentPipelineStages.requisitionId, row.application.requisitionId),
          eq(schema.recruitmentPipelineStages.isActive, true),
        ),
      )
      .orderBy(schema.recruitmentPipelineStages.sortOrder);

    // Get upcoming interviews for this application
    const interviews = await this.db
      .select({
        id: schema.interviews.id,
        scheduledAt: schema.interviews.scheduledAt,
        duration: schema.interviews.duration,
        location: schema.interviews.location,
        interviewType: schema.interviews.interviewType,
        status: schema.interviews.status,
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
          eq(schema.interviews.applicationId, applicationId),
        ),
      )
      .orderBy(schema.interviews.scheduledAt);

    // Determine shared feedback (only if application metadata allows it)
    const appMetadata = (row.application.metadata as Record<string, any>) || {};
    const sharedFeedback = appMetadata.sharedFeedback || null;

    return {
      ...this.toApplicationDetailDto(row),
      pipelineStages: allStages,
      currentStageOrder: row.stageSortOrder,
      interviews: interviews.map((i) => ({
        id: i.id,
        scheduledAt: i.scheduledAt?.toISOString() || null,
        duration: i.duration,
        location: i.location,
        interviewType: i.interviewType,
        status: i.status,
        stageName: i.stageName,
      })),
      sharedFeedback,
    };
  }

  // ── Withdraw Application ──────────────────────────────────────────────
  async withdrawApplication(orgId: string, employeeId: string, applicationId: string, data: Record<string, any>) {
    const [application] = await this.db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.id, applicationId),
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.internalEmployeeId, employeeId),
          eq(schema.applications.isActive, true),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status === 'withdrawn') {
      throw new BadRequestException('Application is already withdrawn');
    }

    if (application.status === 'hired') {
      throw new BadRequestException('Cannot withdraw after being hired');
    }

    if (application.status === 'rejected') {
      throw new BadRequestException('Cannot withdraw a rejected application');
    }

    const [updated] = await this.db
      .update(schema.applications)
      .set({
        status: 'withdrawn',
        withdrawnAt: new Date(),
        withdrawReason: data.reason || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, applicationId))
      .returning();

    // Decrement application count on the posting
    await this.db
      .update(schema.jobPostings)
      .set({
        applicationCount: sql`greatest(${schema.jobPostings.applicationCount} - 1, 0)`,
      })
      .where(eq(schema.jobPostings.id, application.jobPostingId));

    return {
      id: updated.id,
      status: updated.status,
      withdrawnAt: updated.withdrawnAt?.toISOString() || null,
      withdrawReason: updated.withdrawReason,
    };
  }

  // ── Get Application Timeline ──────────────────────────────────────────
  async getApplicationTimeline(orgId: string, employeeId: string, applicationId: string) {
    const [application] = await this.db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.id, applicationId),
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.internalEmployeeId, employeeId),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const timeline: Array<{
      event: string;
      timestamp: string;
      details?: string;
    }> = [];

    // Application created
    timeline.push({
      event: 'application_submitted',
      timestamp: application.appliedAt.toISOString(),
      details: 'Application submitted for internal position',
    });

    // Get interviews (stage transitions are tracked via interviews)
    const interviews = await this.db
      .select({
        interview: schema.interviews,
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
          eq(schema.interviews.applicationId, applicationId),
        ),
      )
      .orderBy(schema.interviews.scheduledAt);

    for (const row of interviews) {
      if (row.interview.scheduledAt) {
        timeline.push({
          event: 'interview_scheduled',
          timestamp: row.interview.scheduledAt.toISOString(),
          details: `${row.stageName || 'Interview'} — ${row.interview.interviewType}`,
        });
      }

      if (row.interview.status === 'completed' && row.interview.decisionAt) {
        timeline.push({
          event: 'interview_completed',
          timestamp: row.interview.decisionAt.toISOString(),
          details: `${row.stageName || 'Interview'} completed — ${row.interview.decision || 'pending'}`,
        });
      }
    }

    // Withdrawn
    if (application.withdrawnAt) {
      timeline.push({
        event: 'application_withdrawn',
        timestamp: application.withdrawnAt.toISOString(),
        details: application.withdrawReason || 'Withdrawn by applicant',
      });
    }

    // Rejected
    if (application.rejectedAt) {
      timeline.push({
        event: 'application_rejected',
        timestamp: application.rejectedAt.toISOString(),
        details: application.rejectionReason || 'Application rejected',
      });
    }

    // Hired
    if (application.hiredAt) {
      timeline.push({
        event: 'application_hired',
        timestamp: application.hiredAt.toISOString(),
        details: 'Offer accepted and hired',
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      applicationId,
      status: application.status,
      timeline,
    };
  }

  // ── Application History (Including Withdrawn/Rejected) ────────────────
  async getApplicationHistory(orgId: string, employeeId: string) {
    const rows = await this.db
      .select({
        application: schema.applications,
        postingTitle: schema.jobPostings.title,
        postingStatus: schema.jobPostings.status,
        postingType: schema.jobPostings.postingType,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        departmentName: schema.departments.name,
      })
      .from(schema.applications)
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.applications.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.applications.currentStageId, schema.recruitmentPipelineStages.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.internalEmployeeId, employeeId),
        ),
      )
      .orderBy(desc(schema.applications.appliedAt));

    return {
      data: rows.map((r) => this.toApplicationListDto(r)),
      total: rows.length,
    };
  }

  // ── DTO Mappers ───────────────────────────────────────────────────────

  private toApplicationListDto(row: {
    application: typeof schema.applications.$inferSelect;
    postingTitle: string;
    postingStatus: string;
    postingType: string;
    stageName: string | null;
    stageType: string | null;
    departmentName: string | null;
  }) {
    return {
      id: row.application.id,
      jobPostingId: row.application.jobPostingId,
      requisitionId: row.application.requisitionId,
      postingTitle: row.postingTitle,
      postingStatus: row.postingStatus,
      postingType: row.postingType,
      departmentName: row.departmentName,
      status: row.application.status,
      currentStageName: row.stageName,
      currentStageType: row.stageType,
      source: row.application.source,
      overallScore: row.application.overallScore ? Number(row.application.overallScore) : null,
      appliedAt: row.application.appliedAt.toISOString(),
      withdrawnAt: row.application.withdrawnAt?.toISOString() || null,
      rejectedAt: row.application.rejectedAt?.toISOString() || null,
      hiredAt: row.application.hiredAt?.toISOString() || null,
      createdAt: row.application.createdAt.toISOString(),
      updatedAt: row.application.updatedAt.toISOString(),
    };
  }

  private toApplicationDetailDto(row: {
    application: typeof schema.applications.$inferSelect;
    postingTitle: string;
    postingDescription: string;
    postingStatus: string;
    postingType: string;
    stageName: string | null;
    stageType: string | null;
    stageSortOrder: number | null;
    departmentName: string | null;
    requisitionTitle: string;
  }) {
    return {
      id: row.application.id,
      jobPostingId: row.application.jobPostingId,
      requisitionId: row.application.requisitionId,
      candidateId: row.application.candidateId,
      postingTitle: row.postingTitle,
      postingDescription: row.postingDescription,
      postingStatus: row.postingStatus,
      postingType: row.postingType,
      requisitionTitle: row.requisitionTitle,
      departmentName: row.departmentName,
      status: row.application.status,
      currentStageName: row.stageName,
      currentStageType: row.stageType,
      source: row.application.source,
      coverLetter: row.application.coverLetter,
      overallScore: row.application.overallScore ? Number(row.application.overallScore) : null,
      rejectionReason: row.application.rejectionReason,
      withdrawReason: row.application.withdrawReason,
      appliedAt: row.application.appliedAt.toISOString(),
      withdrawnAt: row.application.withdrawnAt?.toISOString() || null,
      rejectedAt: row.application.rejectedAt?.toISOString() || null,
      hiredAt: row.application.hiredAt?.toISOString() || null,
      createdAt: row.application.createdAt.toISOString(),
      updatedAt: row.application.updatedAt.toISOString(),
    };
  }
}
