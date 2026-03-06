import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, or, ilike, gte, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class InterviewScheduleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Helper: Get employee's candidate IDs ──────────────────────────────
  private async getEmployeeCandidateIds(orgId: string, employeeId: string): Promise<string[]> {
    // Find applications where this employee is the internal applicant
    const applications = await this.db
      .select({ candidateId: schema.applications.candidateId })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.internalEmployeeId, employeeId),
        ),
      );

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    return candidateIds;
  }

  // ── List Upcoming Interviews ──────────────────────────────────────────
  async listUpcomingInterviews(orgId: string, employeeId: string) {
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);

    if (candidateIds.length === 0) {
      return { data: [], total: 0 };
    }

    const now = new Date();

    const rows = await this.db
      .select({
        interview: schema.interviews,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        postingTitle: schema.jobPostings.title,
      })
      .from(schema.interviews)
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .innerJoin(
        schema.applications,
        eq(schema.interviews.applicationId, schema.applications.id),
      )
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .where(
        and(
          eq(schema.interviews.orgId, orgId),
          sql`${schema.interviews.candidateId} = ANY(${candidateIds}::uuid[])`,
          or(
            eq(schema.interviews.status, 'scheduled'),
            eq(schema.interviews.status, 'confirmed'),
          ),
          gte(schema.interviews.scheduledAt, now),
        ),
      )
      .orderBy(schema.interviews.scheduledAt);

    return {
      data: rows.map((r) => this.toInterviewDto(r)),
      total: rows.length,
    };
  }

  // ── Get Interview Detail ──────────────────────────────────────────────
  async getInterviewDetail(orgId: string, employeeId: string, interviewId: string) {
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);

    if (candidateIds.length === 0) {
      throw new NotFoundException('Interview not found');
    }

    const [row] = await this.db
      .select({
        interview: schema.interviews,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        postingTitle: schema.jobPostings.title,
        postingDescription: schema.jobPostings.description,
        departmentName: schema.departments.name,
      })
      .from(schema.interviews)
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .innerJoin(
        schema.applications,
        eq(schema.interviews.applicationId, schema.applications.id),
      )
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.applications.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.interviews.id, interviewId),
          eq(schema.interviews.orgId, orgId),
          sql`${schema.interviews.candidateId} = ANY(${candidateIds}::uuid[])`,
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Interview not found');
    }

    // Get panel member names
    const panelMembers = (row.interview.panelMembers as Array<Record<string, any>>) || [];
    const panelUserIds = panelMembers
      .map((m) => m.userId)
      .filter(Boolean);

    let panelDetails: Array<{ userId: string; name: string; role?: string; status?: string }> = [];
    if (panelUserIds.length > 0) {
      const panelUsers = await this.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
        })
        .from(schema.users)
        .where(sql`${schema.users.id} = ANY(${panelUserIds}::uuid[])`);

      panelDetails = panelMembers.map((m) => {
        const user = panelUsers.find((u) => u.id === m.userId);
        return {
          userId: m.userId,
          name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : 'Unknown',
          role: m.role || null,
          status: m.status || null,
        };
      });
    }

    return {
      id: row.interview.id,
      applicationId: row.interview.applicationId,
      candidateId: row.interview.candidateId,
      postingTitle: row.postingTitle,
      postingDescription: row.postingDescription,
      departmentName: row.departmentName,
      stageName: row.stageName,
      stageType: row.stageType,
      scheduledAt: row.interview.scheduledAt?.toISOString() || null,
      duration: row.interview.duration,
      location: row.interview.location,
      interviewType: row.interview.interviewType,
      status: row.interview.status,
      panelMembers: panelDetails,
      rescheduleCount: row.interview.rescheduleCount,
      calendarEventId: row.interview.calendarEventId,
      metadata: row.interview.metadata,
      createdAt: row.interview.createdAt.toISOString(),
      updatedAt: row.interview.updatedAt.toISOString(),
    };
  }

  // ── Accept Interview Invitation ───────────────────────────────────────
  async acceptInterview(orgId: string, employeeId: string, interviewId: string) {
    const interview = await this.getAndValidateInterview(orgId, employeeId, interviewId);

    if (interview.status !== 'scheduled' && interview.status !== 'confirmed') {
      throw new BadRequestException('Interview cannot be accepted in its current state');
    }

    // Update panel member status for this employee's candidate
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);
    const panelMembers = (interview.panelMembers as Array<Record<string, any>>) || [];

    // Mark candidate's acceptance in metadata
    const metadata = (interview.metadata as Record<string, any>) || {};
    metadata.candidateAccepted = true;
    metadata.candidateAcceptedAt = new Date().toISOString();

    const [updated] = await this.db
      .update(schema.interviews)
      .set({
        status: 'confirmed',
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(schema.interviews.id, interviewId))
      .returning();

    return {
      id: updated.id,
      status: updated.status,
      message: 'Interview invitation accepted',
    };
  }

  // ── Decline Interview ─────────────────────────────────────────────────
  async declineInterview(orgId: string, employeeId: string, interviewId: string, data: Record<string, any>) {
    const interview = await this.getAndValidateInterview(orgId, employeeId, interviewId);

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestException('Interview cannot be declined in its current state');
    }

    const metadata = (interview.metadata as Record<string, any>) || {};
    metadata.candidateDeclined = true;
    metadata.candidateDeclinedAt = new Date().toISOString();
    metadata.declineReason = data.reason || null;

    const [updated] = await this.db
      .update(schema.interviews)
      .set({
        status: 'cancelled',
        cancelReason: data.reason || 'Declined by candidate',
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(schema.interviews.id, interviewId))
      .returning();

    return {
      id: updated.id,
      status: updated.status,
      message: 'Interview declined',
    };
  }

  // ── Request Reschedule ────────────────────────────────────────────────
  async requestReschedule(orgId: string, employeeId: string, interviewId: string, data: Record<string, any>) {
    const interview = await this.getAndValidateInterview(orgId, employeeId, interviewId);

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestException('Interview cannot be rescheduled in its current state');
    }

    const metadata = (interview.metadata as Record<string, any>) || {};
    const rescheduleRequests = metadata.rescheduleRequests || [];
    rescheduleRequests.push({
      requestedBy: employeeId,
      requestedAt: new Date().toISOString(),
      reason: data.reason || null,
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
    });
    metadata.rescheduleRequests = rescheduleRequests;

    const [updated] = await this.db
      .update(schema.interviews)
      .set({
        status: 'reschedule_requested',
        rescheduleCount: sql`${schema.interviews.rescheduleCount} + 1`,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(schema.interviews.id, interviewId))
      .returning();

    return {
      id: updated.id,
      status: updated.status,
      rescheduleCount: updated.rescheduleCount,
      message: 'Reschedule request submitted',
    };
  }

  // ── List Past Interviews ──────────────────────────────────────────────
  async listPastInterviews(orgId: string, employeeId: string) {
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);

    if (candidateIds.length === 0) {
      return { data: [], total: 0 };
    }

    const now = new Date();

    const rows = await this.db
      .select({
        interview: schema.interviews,
        stageName: schema.recruitmentPipelineStages.name,
        stageType: schema.recruitmentPipelineStages.stageType,
        postingTitle: schema.jobPostings.title,
      })
      .from(schema.interviews)
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .innerJoin(
        schema.applications,
        eq(schema.interviews.applicationId, schema.applications.id),
      )
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .where(
        and(
          eq(schema.interviews.orgId, orgId),
          sql`${schema.interviews.candidateId} = ANY(${candidateIds}::uuid[])`,
          or(
            eq(schema.interviews.status, 'completed'),
            eq(schema.interviews.status, 'cancelled'),
            lt(schema.interviews.scheduledAt, now),
          ),
        ),
      )
      .orderBy(desc(schema.interviews.scheduledAt));

    return {
      data: rows.map((r) => this.toInterviewDto(r)),
      total: rows.length,
    };
  }

  // ── Helper: Get and Validate Interview ────────────────────────────────
  private async getAndValidateInterview(
    orgId: string,
    employeeId: string,
    interviewId: string,
  ) {
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);

    if (candidateIds.length === 0) {
      throw new NotFoundException('Interview not found');
    }

    const [interview] = await this.db
      .select()
      .from(schema.interviews)
      .where(
        and(
          eq(schema.interviews.id, interviewId),
          eq(schema.interviews.orgId, orgId),
          sql`${schema.interviews.candidateId} = ANY(${candidateIds}::uuid[])`,
        ),
      )
      .limit(1);

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  // ── DTO Mapper ────────────────────────────────────────────────────────

  private toInterviewDto(row: {
    interview: typeof schema.interviews.$inferSelect;
    stageName: string | null;
    stageType: string | null;
    postingTitle: string;
  }) {
    return {
      id: row.interview.id,
      applicationId: row.interview.applicationId,
      candidateId: row.interview.candidateId,
      postingTitle: row.postingTitle,
      stageName: row.stageName,
      stageType: row.stageType,
      scheduledAt: row.interview.scheduledAt?.toISOString() || null,
      duration: row.interview.duration,
      location: row.interview.location,
      interviewType: row.interview.interviewType,
      status: row.interview.status,
      decision: row.interview.decision,
      rescheduleCount: row.interview.rescheduleCount,
      createdAt: row.interview.createdAt.toISOString(),
      updatedAt: row.interview.updatedAt.toISOString(),
    };
  }
}
