import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, asc, sql, gte, lte, sum } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class WeeklyTimesheetService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Get Week Grid Data ──────────────────────────────────────────────────
  async getWeekGrid(orgId: string, employeeId: string, weekStart?: string) {
    const startDate = weekStart || this.getMonday(new Date());
    const endDate = this.addDays(startDate, 6);

    // Fetch all entries for the week
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
          gte(schema.timesheetEntries.date, startDate),
          lte(schema.timesheetEntries.date, endDate),
        ),
      )
      .orderBy(asc(schema.timesheetEntries.date), asc(schema.timesheetEntries.createdAt));

    // Group entries by project (rows) and day (columns)
    const projectMap = new Map<string, {
      projectId: string | null;
      projectName: string | null;
      projectCode: string | null;
      projectColor: string | null;
      days: Record<string, { entries: any[]; totalHours: number }>;
      totalHours: number;
    }>();

    const dayDates = this.getWeekDays(startDate);

    for (const row of entries) {
      const projectKey = row.entry.projectId || '__no_project__';

      if (!projectMap.has(projectKey)) {
        const days: Record<string, { entries: any[]; totalHours: number }> = {};
        for (const d of dayDates) {
          days[d] = { entries: [], totalHours: 0 };
        }
        projectMap.set(projectKey, {
          projectId: row.entry.projectId,
          projectName: row.projectName,
          projectCode: row.projectCode,
          projectColor: row.projectColor,
          days,
          totalHours: 0,
        });
      }

      const project = projectMap.get(projectKey)!;
      const dayKey = row.entry.date;
      if (project.days[dayKey]) {
        const hours = Number(row.entry.hours || 0);
        project.days[dayKey].entries.push({
          id: row.entry.id,
          hours,
          description: row.entry.description,
          taskCategoryId: row.entry.taskCategoryId,
          categoryName: row.categoryName,
          isBillable: row.entry.isBillable,
          status: row.entry.status,
        });
        project.days[dayKey].totalHours += hours;
        project.totalHours += hours;
      }
    }

    // Build day totals
    const dayTotals: Record<string, number> = {};
    for (const d of dayDates) {
      dayTotals[d] = 0;
    }
    for (const project of projectMap.values()) {
      for (const d of dayDates) {
        dayTotals[d] += project.days[d].totalHours;
      }
    }

    const grandTotal = Object.values(dayTotals).reduce((s, v) => s + v, 0);

    // Check if a submission exists for this week
    const [submission] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.employeeId, employeeId),
          eq(schema.timesheetSubmissions.periodStart, startDate),
          eq(schema.timesheetSubmissions.periodEnd, endDate),
        ),
      )
      .limit(1);

    return {
      weekStart: startDate,
      weekEnd: endDate,
      days: dayDates,
      rows: Array.from(projectMap.values()),
      dayTotals,
      grandTotal,
      submission: submission ? this.toSubmissionSummaryDto(submission) : null,
    };
  }

  // ── Copy Previous Week ──────────────────────────────────────────────────
  async copyPreviousWeek(orgId: string, employeeId: string, data: Record<string, any>) {
    const targetWeekStart = data.weekStart || this.getMonday(new Date());
    const prevWeekStart = this.addDays(targetWeekStart, -7);
    const prevWeekEnd = this.addDays(prevWeekStart, 6);

    const previousEntries = await this.db
      .select()
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, prevWeekStart),
          lte(schema.timesheetEntries.date, prevWeekEnd),
        ),
      )
      .orderBy(asc(schema.timesheetEntries.date));

    if (previousEntries.length === 0) {
      throw new BadRequestException('No entries found for the previous week');
    }

    const newEntries = [];
    for (const prev of previousEntries) {
      // Shift date forward by 7 days
      const newDate = this.addDays(prev.date, 7);

      const [created] = await this.db
        .insert(schema.timesheetEntries)
        .values({
          orgId,
          employeeId,
          date: newDate,
          projectId: prev.projectId,
          taskCategoryId: prev.taskCategoryId,
          startTime: prev.startTime,
          endTime: prev.endTime,
          hours: prev.hours,
          description: prev.description,
          isBillable: prev.isBillable,
          tags: prev.tags,
          activityType: prev.activityType,
          status: 'draft',
        })
        .returning();

      newEntries.push(created);
    }

    return {
      copiedFromWeek: prevWeekStart,
      copiedToWeek: targetWeekStart,
      entriesCreated: newEntries.length,
    };
  }

  // ── Bulk Fill ───────────────────────────────────────────────────────────
  async bulkFill(orgId: string, employeeId: string, data: Record<string, any>) {
    const { projectId, hours, weekStart, taskCategoryId, description, isBillable } = data;

    if (!hours || Number(hours) <= 0) {
      throw new BadRequestException('hours must be greater than zero');
    }

    const startDate = weekStart || this.getMonday(new Date());
    const dayDates = this.getWeekDays(startDate);

    // Only fill weekdays (Mon-Fri) by default
    const fillDates = dayDates.slice(0, 5); // Mon through Fri

    const created = [];
    for (const date of fillDates) {
      const [entry] = await this.db
        .insert(schema.timesheetEntries)
        .values({
          orgId,
          employeeId,
          date,
          projectId: projectId || null,
          taskCategoryId: taskCategoryId || null,
          hours: String(hours),
          description: description || null,
          isBillable: isBillable || false,
          status: 'draft',
        })
        .returning();
      created.push(entry);
    }

    return {
      weekStart: startDate,
      daysFilledCount: created.length,
      hoursPerDay: Number(hours),
      totalHours: created.length * Number(hours),
    };
  }

  // ── Submit Week ─────────────────────────────────────────────────────────
  async submitWeek(orgId: string, employeeId: string, data: Record<string, any>) {
    const { weekStart, summaryNote } = data;

    const startDate = weekStart || this.getMonday(new Date());
    const endDate = this.addDays(startDate, 6);

    // Check if already submitted
    const [existingSubmission] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.employeeId, employeeId),
          eq(schema.timesheetSubmissions.periodStart, startDate),
          eq(schema.timesheetSubmissions.periodEnd, endDate),
        ),
      )
      .limit(1);

    if (existingSubmission && (existingSubmission.status === 'submitted' || existingSubmission.status === 'approved')) {
      throw new BadRequestException(`Timesheet for this week is already ${existingSubmission.status}`);
    }

    // Get all entries for the week
    const entries = await this.db
      .select()
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, startDate),
          lte(schema.timesheetEntries.date, endDate),
        ),
      );

    if (entries.length === 0) {
      throw new BadRequestException('No timesheet entries found for this week');
    }

    // Calculate totals
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    const dayBreakdown: Record<string, number> = {};

    for (const entry of entries) {
      const hours = Number(entry.hours || 0);
      totalHours += hours;
      if (entry.isBillable) {
        billableHours += hours;
      } else {
        nonBillableHours += hours;
      }
      dayBreakdown[entry.date] = (dayBreakdown[entry.date] || 0) + hours;
    }

    const now = new Date();

    if (existingSubmission) {
      // Update existing submission (e.g., from draft or rejected)
      const [updated] = await this.db
        .update(schema.timesheetSubmissions)
        .set({
          totalHours: String(totalHours),
          billableHours: String(billableHours),
          nonBillableHours: String(nonBillableHours),
          status: 'submitted',
          summaryNote: summaryNote || null,
          dayBreakdown: Object.entries(dayBreakdown).map(([date, hours]) => ({ date, hours })),
          submittedAt: now,
          rejectedAt: null,
          rejectionReason: null,
          updatedAt: now,
        })
        .where(eq(schema.timesheetSubmissions.id, existingSubmission.id))
        .returning();

      // Update all entries to submitted status and link them
      await this.db
        .update(schema.timesheetEntries)
        .set({
          status: 'submitted',
          submissionId: updated.id,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.timesheetEntries.orgId, orgId),
            eq(schema.timesheetEntries.employeeId, employeeId),
            gte(schema.timesheetEntries.date, startDate),
            lte(schema.timesheetEntries.date, endDate),
          ),
        );

      return this.toSubmissionDto(updated);
    }

    // Create new submission
    const [submission] = await this.db
      .insert(schema.timesheetSubmissions)
      .values({
        orgId,
        employeeId,
        periodStart: startDate,
        periodEnd: endDate,
        totalHours: String(totalHours),
        billableHours: String(billableHours),
        nonBillableHours: String(nonBillableHours),
        status: 'submitted',
        summaryNote: summaryNote || null,
        dayBreakdown: Object.entries(dayBreakdown).map(([date, hours]) => ({ date, hours })),
        submittedAt: now,
      })
      .returning();

    // Update all entries to submitted status and link them
    await this.db
      .update(schema.timesheetEntries)
      .set({
        status: 'submitted',
        submissionId: submission.id,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, startDate),
          lte(schema.timesheetEntries.date, endDate),
        ),
      );

    return this.toSubmissionDto(submission);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private getMonday(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().slice(0, 10);
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private getWeekDays(weekStart: string): string[] {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(this.addDays(weekStart, i));
    }
    return days;
  }

  private toSubmissionDto(row: typeof schema.timesheetSubmissions.$inferSelect) {
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
      dayBreakdown: row.dayBreakdown,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toSubmissionSummaryDto(row: typeof schema.timesheetSubmissions.$inferSelect) {
    return {
      id: row.id,
      status: row.status,
      totalHours: Number(row.totalHours),
      billableHours: Number(row.billableHours),
      submittedAt: row.submittedAt?.toISOString() || null,
      approvedAt: row.approvedAt?.toISOString() || null,
    };
  }
}
