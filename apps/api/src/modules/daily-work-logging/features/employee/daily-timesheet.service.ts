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
export class DailyTimesheetService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Get Entries for a Date ──────────────────────────────────────────────
  async getEntriesForDate(orgId: string, employeeId: string, date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const entries = await this.db
      .select({
        entry: schema.timesheetEntries,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        projectColor: schema.projects.color,
        categoryName: schema.taskCategories.name,
        categoryColor: schema.taskCategories.color,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.projects, eq(schema.timesheetEntries.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timesheetEntries.taskCategoryId, schema.taskCategories.id))
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          eq(schema.timesheetEntries.date, targetDate),
        ),
      )
      .orderBy(asc(schema.timesheetEntries.startTime), asc(schema.timesheetEntries.createdAt));

    const totalHours = entries.reduce((sum, e) => sum + Number(e.entry.hours || 0), 0);
    const billableHours = entries
      .filter((e) => e.entry.isBillable)
      .reduce((sum, e) => sum + Number(e.entry.hours || 0), 0);

    return {
      date: targetDate,
      entries: entries.map((e) => this.toEntryDto(e)),
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      entryCount: entries.length,
    };
  }

  // ── Create Timesheet Entry ──────────────────────────────────────────────
  async createEntry(orgId: string, employeeId: string, data: Record<string, any>) {
    const {
      date,
      projectId,
      taskCategoryId,
      startTime,
      endTime,
      hours,
      description,
      isBillable,
      tags,
      activityType,
    } = data;

    if (!date) {
      throw new BadRequestException('date is required');
    }

    if (!hours && (!startTime || !endTime)) {
      throw new BadRequestException('Either hours or startTime/endTime are required');
    }

    // Calculate hours from start/end time if not provided directly
    let calculatedHours = hours;
    if (!calculatedHours && startTime && endTime) {
      calculatedHours = this.calculateHoursFromTimeRange(startTime, endTime);
    }

    if (Number(calculatedHours) <= 0) {
      throw new BadRequestException('Hours must be greater than zero');
    }

    // Validate projectId belongs to org if provided
    if (projectId) {
      const [project] = await this.db
        .select()
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.id, projectId),
            eq(schema.projects.orgId, orgId),
          ),
        )
        .limit(1);

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    // Validate taskCategoryId belongs to org if provided
    if (taskCategoryId) {
      const [category] = await this.db
        .select()
        .from(schema.taskCategories)
        .where(
          and(
            eq(schema.taskCategories.id, taskCategoryId),
            eq(schema.taskCategories.orgId, orgId),
          ),
        )
        .limit(1);

      if (!category) {
        throw new NotFoundException('Task category not found');
      }
    }

    const [entry] = await this.db
      .insert(schema.timesheetEntries)
      .values({
        orgId,
        employeeId,
        date,
        projectId: projectId || null,
        taskCategoryId: taskCategoryId || null,
        startTime: startTime || null,
        endTime: endTime || null,
        hours: String(calculatedHours),
        description: description || null,
        isBillable: isBillable || false,
        tags: tags || [],
        activityType: activityType || null,
        status: 'draft',
      })
      .returning();

    return this.toBasicEntryDto(entry);
  }

  // ── Update Timesheet Entry ──────────────────────────────────────────────
  async updateEntry(orgId: string, employeeId: string, entryId: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.id, entryId),
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Timesheet entry not found');
    }

    if (existing.status === 'approved' || existing.status === 'locked') {
      throw new BadRequestException('Cannot update an approved or locked entry');
    }

    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (data.projectId !== undefined) updateFields.projectId = data.projectId || null;
    if (data.taskCategoryId !== undefined) updateFields.taskCategoryId = data.taskCategoryId || null;
    if (data.startTime !== undefined) updateFields.startTime = data.startTime || null;
    if (data.endTime !== undefined) updateFields.endTime = data.endTime || null;
    if (data.description !== undefined) updateFields.description = data.description || null;
    if (data.isBillable !== undefined) updateFields.isBillable = data.isBillable;
    if (data.tags !== undefined) updateFields.tags = data.tags;
    if (data.activityType !== undefined) updateFields.activityType = data.activityType || null;

    // Recalculate hours if start/end time changed
    if (data.hours !== undefined) {
      updateFields.hours = String(data.hours);
    } else if (data.startTime && data.endTime) {
      updateFields.hours = String(this.calculateHoursFromTimeRange(data.startTime, data.endTime));
    }

    const [updated] = await this.db
      .update(schema.timesheetEntries)
      .set(updateFields)
      .where(eq(schema.timesheetEntries.id, entryId))
      .returning();

    return this.toBasicEntryDto(updated);
  }

  // ── Delete Draft Entry ──────────────────────────────────────────────────
  async deleteEntry(orgId: string, employeeId: string, entryId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.id, entryId),
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Timesheet entry not found');
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft entries can be deleted');
    }

    await this.db
      .delete(schema.timesheetEntries)
      .where(eq(schema.timesheetEntries.id, entryId));

    return { deleted: true, id: entryId };
  }

  // ── Copy Previous Day Entries ───────────────────────────────────────────
  async copyPreviousDay(orgId: string, employeeId: string, data: Record<string, any>) {
    const targetDate = data.date || new Date().toISOString().slice(0, 10);

    // Calculate previous day
    const prevDate = new Date(targetDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const previousDateStr = prevDate.toISOString().slice(0, 10);

    const previousEntries = await this.db
      .select()
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          eq(schema.timesheetEntries.date, previousDateStr),
        ),
      )
      .orderBy(asc(schema.timesheetEntries.startTime));

    if (previousEntries.length === 0) {
      throw new BadRequestException('No entries found for the previous day');
    }

    const newEntries = [];
    for (const prev of previousEntries) {
      const [created] = await this.db
        .insert(schema.timesheetEntries)
        .values({
          orgId,
          employeeId,
          date: targetDate,
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
      newEntries.push(this.toBasicEntryDto(created));
    }

    return {
      copiedFrom: previousDateStr,
      copiedTo: targetDate,
      entriesCreated: newEntries.length,
      entries: newEntries,
    };
  }

  // ── Auto-Populate from Attendance ───────────────────────────────────────
  async getAutoPopulateData(orgId: string, employeeId: string, date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const [attendanceRecord] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, employeeId),
          eq(schema.attendanceRecords.date, targetDate),
        ),
      )
      .limit(1);

    if (!attendanceRecord) {
      return {
        date: targetDate,
        hasAttendance: false,
        clockIn: null,
        clockOut: null,
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        availableHours: 0,
        message: 'No attendance record found for this date',
      };
    }

    const totalWorkMinutes = attendanceRecord.totalWorkMinutes || 0;
    const totalBreakMinutes = attendanceRecord.totalBreakMinutes || 0;
    const availableHours = Math.round((totalWorkMinutes / 60) * 100) / 100;

    // Get already logged hours for this date
    const loggedResult = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          eq(schema.timesheetEntries.date, targetDate),
        ),
      );

    const alreadyLogged = Number(loggedResult[0]?.total || 0);
    const remainingHours = Math.max(0, availableHours - alreadyLogged);

    return {
      date: targetDate,
      hasAttendance: true,
      clockIn: attendanceRecord.clockIn?.toISOString() || null,
      clockOut: attendanceRecord.clockOut?.toISOString() || null,
      totalWorkMinutes,
      totalBreakMinutes,
      availableHours,
      alreadyLoggedHours: alreadyLogged,
      remainingHours,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private calculateHoursFromTimeRange(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const diffMinutes = endMinutes - startMinutes;

    if (diffMinutes <= 0) {
      return 0;
    }
    return Math.round((diffMinutes / 60) * 100) / 100;
  }

  private toEntryDto(row: {
    entry: typeof schema.timesheetEntries.$inferSelect;
    projectName: string | null;
    projectCode: string | null;
    projectColor: string | null;
    categoryName: string | null;
    categoryColor: string | null;
  }) {
    return {
      id: row.entry.id,
      orgId: row.entry.orgId,
      employeeId: row.entry.employeeId,
      date: row.entry.date,
      projectId: row.entry.projectId,
      projectName: row.projectName,
      projectCode: row.projectCode,
      projectColor: row.projectColor,
      taskCategoryId: row.entry.taskCategoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      startTime: row.entry.startTime,
      endTime: row.entry.endTime,
      hours: Number(row.entry.hours),
      description: row.entry.description,
      isBillable: row.entry.isBillable,
      tags: row.entry.tags,
      activityType: row.entry.activityType,
      submissionId: row.entry.submissionId,
      status: row.entry.status,
      metadata: row.entry.metadata,
      createdAt: row.entry.createdAt.toISOString(),
      updatedAt: row.entry.updatedAt.toISOString(),
    };
  }

  private toBasicEntryDto(row: typeof schema.timesheetEntries.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      date: row.date,
      projectId: row.projectId,
      taskCategoryId: row.taskCategoryId,
      startTime: row.startTime,
      endTime: row.endTime,
      hours: Number(row.hours),
      description: row.description,
      isBillable: row.isBillable,
      tags: row.tags,
      activityType: row.activityType,
      submissionId: row.submissionId,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
