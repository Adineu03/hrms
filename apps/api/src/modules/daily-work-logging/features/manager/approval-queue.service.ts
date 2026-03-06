import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, count, sum, avg, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ApprovalQueueService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const team = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return team.map((t) => t.userId);
  }

  async getPendingSubmissions(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    if (teamIds.length === 0) {
      return { total: 0, submissions: [] };
    }

    const pendingSubmissions = await this.db
      .select({
        id: schema.timesheetSubmissions.id,
        employeeId: schema.timesheetSubmissions.employeeId,
        periodStart: schema.timesheetSubmissions.periodStart,
        periodEnd: schema.timesheetSubmissions.periodEnd,
        totalHours: schema.timesheetSubmissions.totalHours,
        billableHours: schema.timesheetSubmissions.billableHours,
        nonBillableHours: schema.timesheetSubmissions.nonBillableHours,
        status: schema.timesheetSubmissions.status,
        summaryNote: schema.timesheetSubmissions.summaryNote,
        submittedAt: schema.timesheetSubmissions.submittedAt,
        dayBreakdown: schema.timesheetSubmissions.dayBreakdown,
        metadata: schema.timesheetSubmissions.metadata,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
      })
      .from(schema.timesheetSubmissions)
      .innerJoin(schema.users, eq(schema.timesheetSubmissions.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamIds),
          eq(schema.timesheetSubmissions.status, 'submitted'),
        ),
      )
      .orderBy(desc(schema.timesheetSubmissions.submittedAt));

    const submissions = pendingSubmissions.map((sub) => ({
      id: sub.id,
      employeeId: sub.employeeId,
      employeeName: `${sub.employeeFirstName} ${sub.employeeLastName ?? ''}`.trim(),
      employeeEmail: sub.employeeEmail,
      periodStart: sub.periodStart,
      periodEnd: sub.periodEnd,
      totalHours: Number(sub.totalHours),
      billableHours: Number(sub.billableHours),
      nonBillableHours: Number(sub.nonBillableHours),
      status: sub.status,
      summaryNote: sub.summaryNote,
      submittedAt: sub.submittedAt,
      dayBreakdown: sub.dayBreakdown,
      metadata: sub.metadata,
    }));

    return { total: submissions.length, submissions };
  }

  async getSubmissionDetail(orgId: string, managerId: string, submissionId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    if (teamIds.length === 0) {
      throw new NotFoundException('Submission not found');
    }

    // Get the submission
    const [submission] = await this.db
      .select({
        id: schema.timesheetSubmissions.id,
        employeeId: schema.timesheetSubmissions.employeeId,
        periodStart: schema.timesheetSubmissions.periodStart,
        periodEnd: schema.timesheetSubmissions.periodEnd,
        totalHours: schema.timesheetSubmissions.totalHours,
        billableHours: schema.timesheetSubmissions.billableHours,
        nonBillableHours: schema.timesheetSubmissions.nonBillableHours,
        status: schema.timesheetSubmissions.status,
        summaryNote: schema.timesheetSubmissions.summaryNote,
        approvalChain: schema.timesheetSubmissions.approvalChain,
        submittedAt: schema.timesheetSubmissions.submittedAt,
        approvedAt: schema.timesheetSubmissions.approvedAt,
        approvedBy: schema.timesheetSubmissions.approvedBy,
        approverComment: schema.timesheetSubmissions.approverComment,
        rejectedAt: schema.timesheetSubmissions.rejectedAt,
        rejectionReason: schema.timesheetSubmissions.rejectionReason,
        dayBreakdown: schema.timesheetSubmissions.dayBreakdown,
        metadata: schema.timesheetSubmissions.metadata,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
      })
      .from(schema.timesheetSubmissions)
      .innerJoin(schema.users, eq(schema.timesheetSubmissions.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamIds),
        ),
      );

    if (!submission) {
      throw new NotFoundException('Submission not found or not accessible');
    }

    // Get the entries for this submission period and employee
    const entries = await this.db
      .select({
        id: schema.timesheetEntries.id,
        date: schema.timesheetEntries.date,
        hours: schema.timesheetEntries.hours,
        description: schema.timesheetEntries.description,
        startTime: schema.timesheetEntries.startTime,
        endTime: schema.timesheetEntries.endTime,
        isBillable: schema.timesheetEntries.isBillable,
        activityType: schema.timesheetEntries.activityType,
        status: schema.timesheetEntries.status,
        tags: schema.timesheetEntries.tags,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        taskCategoryName: schema.taskCategories.name,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.projects, eq(schema.timesheetEntries.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timesheetEntries.taskCategoryId, schema.taskCategories.id))
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, submission.employeeId),
          gte(schema.timesheetEntries.date, submission.periodStart),
          lte(schema.timesheetEntries.date, submission.periodEnd),
        ),
      )
      .orderBy(schema.timesheetEntries.date, schema.timesheetEntries.startTime);

    // Get attendance data for the same period
    const attendanceRecords = await this.db
      .select({
        date: schema.attendanceRecords.date,
        status: schema.attendanceRecords.status,
        clockIn: schema.attendanceRecords.clockIn,
        clockOut: schema.attendanceRecords.clockOut,
        totalWorkMinutes: schema.attendanceRecords.totalWorkMinutes,
        lateMinutes: schema.attendanceRecords.lateMinutes,
        overtimeMinutes: schema.attendanceRecords.overtimeMinutes,
      })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, submission.employeeId),
          gte(schema.attendanceRecords.date, submission.periodStart),
          lte(schema.attendanceRecords.date, submission.periodEnd),
        ),
      )
      .orderBy(schema.attendanceRecords.date);

    return {
      id: submission.id,
      employeeId: submission.employeeId,
      employeeName: `${submission.employeeFirstName} ${submission.employeeLastName ?? ''}`.trim(),
      employeeEmail: submission.employeeEmail,
      periodStart: submission.periodStart,
      periodEnd: submission.periodEnd,
      totalHours: Number(submission.totalHours),
      billableHours: Number(submission.billableHours),
      nonBillableHours: Number(submission.nonBillableHours),
      status: submission.status,
      summaryNote: submission.summaryNote,
      approvalChain: submission.approvalChain,
      submittedAt: submission.submittedAt,
      approvedAt: submission.approvedAt,
      approvedBy: submission.approvedBy,
      approverComment: submission.approverComment,
      rejectedAt: submission.rejectedAt,
      rejectionReason: submission.rejectionReason,
      dayBreakdown: submission.dayBreakdown,
      metadata: submission.metadata,
      entries: entries.map((e) => ({
        id: e.id,
        date: e.date,
        hours: Number(e.hours),
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        isBillable: e.isBillable,
        activityType: e.activityType,
        status: e.status,
        tags: e.tags,
        projectName: e.projectName,
        projectCode: e.projectCode,
        taskCategory: e.taskCategoryName,
      })),
      attendance: attendanceRecords.map((a) => ({
        date: a.date,
        status: a.status,
        clockIn: a.clockIn,
        clockOut: a.clockOut,
        totalWorkMinutes: a.totalWorkMinutes,
        lateMinutes: a.lateMinutes,
        overtimeMinutes: a.overtimeMinutes,
      })),
    };
  }

  async approveSubmission(orgId: string, managerId: string, submissionId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [submission] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamIds),
          eq(schema.timesheetSubmissions.status, 'submitted'),
        ),
      );

    if (!submission) {
      throw new NotFoundException('Submission not found or not in submitted status');
    }

    const now = new Date();

    await this.db
      .update(schema.timesheetSubmissions)
      .set({
        status: 'approved',
        approvedBy: managerId,
        approvedAt: now,
        approverComment: body.comment ?? null,
        updatedAt: now,
      })
      .where(eq(schema.timesheetSubmissions.id, submissionId));

    // Also update the linked timesheet entries to 'approved' status
    await this.db
      .update(schema.timesheetEntries)
      .set({
        status: 'approved',
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, submission.employeeId),
          gte(schema.timesheetEntries.date, submission.periodStart),
          lte(schema.timesheetEntries.date, submission.periodEnd),
        ),
      );

    return {
      id: submissionId,
      status: 'approved',
      approvedBy: managerId,
      approvedAt: now.toISOString(),
      comment: body.comment ?? null,
    };
  }

  async rejectSubmission(orgId: string, managerId: string, submissionId: string, body: Record<string, any>) {
    if (!body.reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [submission] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamIds),
          eq(schema.timesheetSubmissions.status, 'submitted'),
        ),
      );

    if (!submission) {
      throw new NotFoundException('Submission not found or not in submitted status');
    }

    const now = new Date();

    await this.db
      .update(schema.timesheetSubmissions)
      .set({
        status: 'rejected',
        rejectedAt: now,
        rejectionReason: body.reason,
        approverComment: body.comment ?? null,
        updatedAt: now,
      })
      .where(eq(schema.timesheetSubmissions.id, submissionId));

    // Set entries back to draft so employee can edit and resubmit
    await this.db
      .update(schema.timesheetEntries)
      .set({
        status: 'draft',
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, submission.employeeId),
          gte(schema.timesheetEntries.date, submission.periodStart),
          lte(schema.timesheetEntries.date, submission.periodEnd),
        ),
      );

    return {
      id: submissionId,
      status: 'rejected',
      rejectedBy: managerId,
      rejectedAt: now.toISOString(),
      reason: body.reason,
      comment: body.comment ?? null,
    };
  }

  async bulkApprove(orgId: string, managerId: string, body: Record<string, any>) {
    const { submissionIds } = body;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      throw new BadRequestException('submissionIds array is required');
    }

    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    const now = new Date();
    const results: { id: string; status: string; error?: string }[] = [];

    for (const submissionId of submissionIds) {
      try {
        const [submission] = await this.db
          .select()
          .from(schema.timesheetSubmissions)
          .where(
            and(
              eq(schema.timesheetSubmissions.id, submissionId),
              eq(schema.timesheetSubmissions.orgId, orgId),
              inArray(schema.timesheetSubmissions.employeeId, teamIds),
              eq(schema.timesheetSubmissions.status, 'submitted'),
            ),
          );

        if (!submission) {
          results.push({ id: submissionId, status: 'error', error: 'Not found or not in submitted status' });
          continue;
        }

        await this.db
          .update(schema.timesheetSubmissions)
          .set({
            status: 'approved',
            approvedBy: managerId,
            approvedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.timesheetSubmissions.id, submissionId));

        // Also update linked entries
        await this.db
          .update(schema.timesheetEntries)
          .set({
            status: 'approved',
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.timesheetEntries.orgId, orgId),
              eq(schema.timesheetEntries.employeeId, submission.employeeId),
              gte(schema.timesheetEntries.date, submission.periodStart),
              lte(schema.timesheetEntries.date, submission.periodEnd),
            ),
          );

        results.push({ id: submissionId, status: 'approved' });
      } catch {
        results.push({ id: submissionId, status: 'error', error: 'Processing failed' });
      }
    }

    return {
      total: submissionIds.length,
      approved: results.filter((r) => r.status === 'approved').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    };
  }
}
