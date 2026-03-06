import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TimesheetHistoryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── List Past Submissions ───────────────────────────────────────────────
  async listSubmissions(
    orgId: string,
    employeeId: string,
    filters: {
      status?: string;
      from?: string;
      to?: string;
      projectId?: string;
      page?: string;
      limit?: string;
    },
  ) {
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.timesheetSubmissions.orgId, orgId),
      eq(schema.timesheetSubmissions.employeeId, employeeId),
    ];

    if (filters.status) {
      conditions.push(eq(schema.timesheetSubmissions.status, filters.status));
    }
    if (filters.from) {
      conditions.push(gte(schema.timesheetSubmissions.periodStart, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(schema.timesheetSubmissions.periodEnd, filters.to));
    }

    const whereClause = and(...conditions)!;

    const submissions = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(whereClause)
      .orderBy(desc(schema.timesheetSubmissions.periodStart))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ total: sql<string>`count(*)` })
      .from(schema.timesheetSubmissions)
      .where(whereClause);

    const total = parseInt(countResult?.total || '0', 10);

    return {
      submissions: submissions.map((s) => this.toSubmissionListDto(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Single Submission with Entries and Approval Chain ────────────────
  async getSubmission(orgId: string, employeeId: string, submissionId: string) {
    const [submission] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Get all entries linked to this submission
    const entries = await this.db
      .select({
        entry: schema.timesheetEntries,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        projectColor: schema.projects.color,
        categoryName: schema.taskCategories.name,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.projects, eq(schema.timesheetEntries.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timesheetEntries.taskCategoryId, schema.taskCategories.id))
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          eq(schema.timesheetEntries.submissionId, submissionId),
        ),
      )
      .orderBy(asc(schema.timesheetEntries.date), asc(schema.timesheetEntries.startTime));

    // Get approver details if available
    let approverName: string | null = null;
    if (submission.approvedBy) {
      const [approver] = await this.db
        .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.id, submission.approvedBy))
        .limit(1);

      if (approver) {
        approverName = `${approver.firstName} ${approver.lastName || ''}`.trim();
      }
    }

    return {
      ...this.toSubmissionDetailDto(submission),
      approverName,
      entries: entries.map((e) => ({
        id: e.entry.id,
        date: e.entry.date,
        projectId: e.entry.projectId,
        projectName: e.projectName,
        projectCode: e.projectCode,
        projectColor: e.projectColor,
        taskCategoryId: e.entry.taskCategoryId,
        categoryName: e.categoryName,
        startTime: e.entry.startTime,
        endTime: e.entry.endTime,
        hours: Number(e.entry.hours),
        description: e.entry.description,
        isBillable: e.entry.isBillable,
        tags: e.entry.tags,
        activityType: e.entry.activityType,
        status: e.entry.status,
      })),
    };
  }

  // ── Resubmit Rejected Timesheet ─────────────────────────────────────────
  async resubmit(orgId: string, employeeId: string, submissionId: string, data: Record<string, any>) {
    const [submission] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'rejected') {
      throw new BadRequestException('Only rejected submissions can be resubmitted');
    }

    const now = new Date();

    // If modifications are provided, update entries
    if (data.modifications && Array.isArray(data.modifications)) {
      for (const mod of data.modifications) {
        if (!mod.entryId) continue;

        const updateFields: Record<string, any> = { updatedAt: now };
        if (mod.hours !== undefined) updateFields.hours = String(mod.hours);
        if (mod.description !== undefined) updateFields.description = mod.description;
        if (mod.projectId !== undefined) updateFields.projectId = mod.projectId || null;
        if (mod.taskCategoryId !== undefined) updateFields.taskCategoryId = mod.taskCategoryId || null;
        if (mod.isBillable !== undefined) updateFields.isBillable = mod.isBillable;

        await this.db
          .update(schema.timesheetEntries)
          .set(updateFields)
          .where(
            and(
              eq(schema.timesheetEntries.id, mod.entryId),
              eq(schema.timesheetEntries.orgId, orgId),
              eq(schema.timesheetEntries.employeeId, employeeId),
              eq(schema.timesheetEntries.submissionId, submissionId),
            ),
          );
      }
    }

    // Recalculate totals from current entries
    const entries = await this.db
      .select()
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          eq(schema.timesheetEntries.submissionId, submissionId),
        ),
      );

    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    for (const entry of entries) {
      const h = Number(entry.hours || 0);
      totalHours += h;
      if (entry.isBillable) billableHours += h;
      else nonBillableHours += h;
    }

    // Update submission status
    const [updated] = await this.db
      .update(schema.timesheetSubmissions)
      .set({
        status: 'submitted',
        totalHours: String(totalHours),
        billableHours: String(billableHours),
        nonBillableHours: String(nonBillableHours),
        summaryNote: data.summaryNote || submission.summaryNote,
        submittedAt: now,
        rejectedAt: null,
        rejectionReason: null,
        approvedBy: null,
        approvedAt: null,
        approverComment: null,
        updatedAt: now,
      })
      .where(eq(schema.timesheetSubmissions.id, submissionId))
      .returning();

    // Update entry statuses
    await this.db
      .update(schema.timesheetEntries)
      .set({ status: 'submitted', updatedAt: now })
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          eq(schema.timesheetEntries.submissionId, submissionId),
        ),
      );

    return this.toSubmissionDetailDto(updated);
  }

  // ── Withdraw Submission ─────────────────────────────────────────────────
  async withdraw(orgId: string, employeeId: string, submissionId: string) {
    const [submission] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'submitted' && submission.status !== 'pending') {
      throw new BadRequestException('Only submitted or pending submissions can be withdrawn');
    }

    const now = new Date();

    const [updated] = await this.db
      .update(schema.timesheetSubmissions)
      .set({
        status: 'draft',
        submittedAt: null,
        updatedAt: now,
      })
      .where(eq(schema.timesheetSubmissions.id, submissionId))
      .returning();

    // Revert entries to draft
    await this.db
      .update(schema.timesheetEntries)
      .set({ status: 'draft', updatedAt: now })
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          eq(schema.timesheetEntries.submissionId, submissionId),
        ),
      );

    return this.toSubmissionDetailDto(updated);
  }

  // ── Hour Summary ────────────────────────────────────────────────────────
  async getSummary(orgId: string, employeeId: string, filters: { from?: string; to?: string }) {
    // Default to last 12 weeks
    const now = new Date();
    const to = filters.to || now.toISOString().slice(0, 10);
    const fromDefault = new Date(now);
    fromDefault.setDate(fromDefault.getDate() - 84); // 12 weeks
    const from = filters.from || fromDefault.toISOString().slice(0, 10);

    // Get weekly summaries from submissions
    const submissions = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.employeeId, employeeId),
          gte(schema.timesheetSubmissions.periodStart, from),
          lte(schema.timesheetSubmissions.periodEnd, to),
        ),
      )
      .orderBy(asc(schema.timesheetSubmissions.periodStart));

    const weeklySummary = submissions.map((s) => ({
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      totalHours: Number(s.totalHours),
      billableHours: Number(s.billableHours),
      nonBillableHours: Number(s.nonBillableHours),
      status: s.status,
    }));

    // Calculate monthly totals from entries
    const monthlyResult = await this.db
      .select({
        month: sql<string>`TO_CHAR(${schema.timesheetEntries.date}::date, 'YYYY-MM')`,
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${schema.timesheetEntries.isBillable} THEN ${schema.timesheetEntries.hours}::numeric ELSE 0 END), 0)`,
        entryCount: sql<string>`count(*)`,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      )
      .groupBy(sql`TO_CHAR(${schema.timesheetEntries.date}::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${schema.timesheetEntries.date}::date, 'YYYY-MM')`);

    const monthlySummary = monthlyResult.map((m) => ({
      month: m.month,
      totalHours: Number(m.totalHours),
      billableHours: Number(m.billableHours),
      nonBillableHours: Number(m.totalHours) - Number(m.billableHours),
      entryCount: parseInt(m.entryCount, 10),
    }));

    // Grand totals
    const grandTotalHours = weeklySummary.reduce((s, w) => s + w.totalHours, 0);
    const grandBillableHours = weeklySummary.reduce((s, w) => s + w.billableHours, 0);

    return {
      period: { from, to },
      weeklySummary,
      monthlySummary,
      grandTotal: {
        totalHours: grandTotalHours,
        billableHours: grandBillableHours,
        nonBillableHours: grandTotalHours - grandBillableHours,
        submissionCount: submissions.length,
      },
    };
  }

  // ── Compliance History ──────────────────────────────────────────────────
  async getCompliance(orgId: string, employeeId: string, filters: { from?: string; to?: string }) {
    const now = new Date();
    const to = filters.to || now.toISOString().slice(0, 10);
    const fromDefault = new Date(now);
    fromDefault.setDate(fromDefault.getDate() - 84);
    const from = filters.from || fromDefault.toISOString().slice(0, 10);

    // Get all submissions for the period
    const submissions = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.employeeId, employeeId),
          gte(schema.timesheetSubmissions.periodStart, from),
          lte(schema.timesheetSubmissions.periodEnd, to),
        ),
      )
      .orderBy(desc(schema.timesheetSubmissions.periodStart));

    // Get org's timesheet policy for expected submission frequency
    const [policy] = await this.db
      .select()
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isDefault, true),
          eq(schema.timesheetPolicies.isActive, true),
        ),
      )
      .limit(1);

    const expectedHoursPerWeek = policy ? Number(policy.minHoursPerWeek || 40) : 40;

    // Calculate compliance metrics
    let totalWeeks = 0;
    let submittedOnTime = 0;
    let submittedLate = 0;
    let missed = 0;
    let approved = 0;
    let rejected = 0;

    // Calculate expected weeks in the period
    const startD = new Date(from);
    const endD = new Date(to);
    const totalDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
    totalWeeks = Math.ceil(totalDays / 7);

    const submissionWeeks = new Set<string>();
    for (const s of submissions) {
      submissionWeeks.add(s.periodStart);
      if (s.status === 'approved') approved++;
      if (s.status === 'rejected') rejected++;

      // Check if submitted on time (within grace period of deadline)
      const deadline = new Date(s.periodEnd);
      deadline.setDate(deadline.getDate() + (policy?.gracePeriodDays || 2));

      if (s.submittedAt && new Date(s.submittedAt) <= deadline) {
        submittedOnTime++;
      } else if (s.submittedAt) {
        submittedLate++;
      }
    }

    missed = Math.max(0, totalWeeks - submissions.length);
    const complianceRate = totalWeeks > 0
      ? Math.round((submittedOnTime / totalWeeks) * 100)
      : 100;

    return {
      period: { from, to },
      totalWeeks,
      submissionsTotal: submissions.length,
      submittedOnTime,
      submittedLate,
      missed,
      approved,
      rejected,
      complianceRate,
      expectedHoursPerWeek,
      submissions: submissions.map((s) => ({
        id: s.id,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        status: s.status,
        totalHours: Number(s.totalHours),
        submittedAt: s.submittedAt?.toISOString() || null,
        approvedAt: s.approvedAt?.toISOString() || null,
        rejectedAt: s.rejectedAt?.toISOString() || null,
      })),
    };
  }

  // ── Generate PDF Statement Data ─────────────────────────────────────────
  async getPdfData(orgId: string, employeeId: string, submissionId: string) {
    // Get submission with full details
    const submissionDetail = await this.getSubmission(orgId, employeeId, submissionId);

    // Get employee profile
    const [profile] = await this.db
      .select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.id, employeeId))
      .limit(1);

    // Get org info
    const [org] = await this.db
      .select({ name: schema.orgs.name })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    // Group entries by date for a clean PDF layout
    const entriesByDate: Record<string, any[]> = {};
    for (const entry of submissionDetail.entries) {
      if (!entriesByDate[entry.date]) {
        entriesByDate[entry.date] = [];
      }
      entriesByDate[entry.date].push(entry);
    }

    return {
      generatedAt: new Date().toISOString(),
      organization: org?.name || '',
      employee: {
        name: profile ? `${profile.firstName} ${profile.lastName || ''}`.trim() : '',
        email: profile?.email || '',
      },
      submission: {
        id: submissionDetail.id,
        periodStart: submissionDetail.periodStart,
        periodEnd: submissionDetail.periodEnd,
        totalHours: submissionDetail.totalHours,
        billableHours: submissionDetail.billableHours,
        nonBillableHours: submissionDetail.nonBillableHours,
        status: submissionDetail.status,
        submittedAt: submissionDetail.submittedAt,
        approvedAt: submissionDetail.approvedAt,
        approverName: submissionDetail.approverName,
        approverComment: submissionDetail.approverComment,
      },
      entriesByDate,
      dayBreakdown: submissionDetail.dayBreakdown,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private toSubmissionListDto(row: typeof schema.timesheetSubmissions.$inferSelect) {
    return {
      id: row.id,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      totalHours: Number(row.totalHours),
      billableHours: Number(row.billableHours),
      nonBillableHours: Number(row.nonBillableHours),
      status: row.status,
      submittedAt: row.submittedAt?.toISOString() || null,
      approvedAt: row.approvedAt?.toISOString() || null,
      rejectedAt: row.rejectedAt?.toISOString() || null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toSubmissionDetailDto(row: typeof schema.timesheetSubmissions.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      totalHours: Number(row.totalHours),
      billableHours: Number(row.billableHours),
      nonBillableHours: Number(row.nonBillableHours),
      status: row.status,
      summaryNote: row.summaryNote,
      approvalChain: row.approvalChain,
      currentApproverLevel: row.currentApproverLevel,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt?.toISOString() || null,
      approverComment: row.approverComment,
      rejectedAt: row.rejectedAt?.toISOString() || null,
      rejectionReason: row.rejectionReason,
      submittedAt: row.submittedAt?.toISOString() || null,
      lockedAt: row.lockedAt?.toISOString() || null,
      lockedBy: row.lockedBy,
      dayBreakdown: row.dayBreakdown,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
