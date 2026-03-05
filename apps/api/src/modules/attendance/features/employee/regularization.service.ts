import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte, sql, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class RegularizationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Submit Regularization ─────────────────────────────────────────────
  async submit(orgId: string, userId: string, data: Record<string, any>) {
    if (!data.date || !data.punchType || !data.requestedTime || !data.reason) {
      throw new BadRequestException('date, punchType, requestedTime, and reason are required');
    }

    const validPunchTypes = ['clock_in', 'clock_out'];
    if (!validPunchTypes.includes(data.punchType)) {
      throw new BadRequestException('punchType must be clock_in or clock_out');
    }

    // Validate deadline
    const policy = await this.getPolicy(orgId);
    const deadlineDays = policy?.regularizationDeadlineDays || 7;

    const requestDate = new Date(data.date);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > deadlineDays) {
      throw new BadRequestException(
        `Regularization deadline exceeded. You can only regularize within ${deadlineDays} days.`,
      );
    }

    if (diffDays < 0) {
      throw new BadRequestException('Cannot regularize a future date');
    }

    // Check for duplicate pending request
    const [existingReq] = await this.db
      .select()
      .from(schema.attendanceRegularizations)
      .where(
        and(
          eq(schema.attendanceRegularizations.orgId, orgId),
          eq(schema.attendanceRegularizations.employeeId, userId),
          eq(schema.attendanceRegularizations.date, data.date),
          eq(schema.attendanceRegularizations.punchType, data.punchType),
          eq(schema.attendanceRegularizations.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingReq) {
      throw new BadRequestException(
        'A pending regularization request already exists for this date and punch type',
      );
    }

    // Calculate SLA deadline
    const slaDeadline = new Date(now);
    slaDeadline.setDate(slaDeadline.getDate() + 3); // 3-day SLA

    const [created] = await this.db
      .insert(schema.attendanceRegularizations)
      .values({
        orgId,
        employeeId: userId,
        date: data.date,
        punchType: data.punchType,
        requestedTime: new Date(data.requestedTime),
        reason: data.reason,
        reasonCode: data.reasonCode || null,
        evidence: data.evidence || [],
        status: 'pending',
        slaDeadline,
      })
      .returning();

    return this.toDto(created);
  }

  // ── List Regularizations ──────────────────────────────────────────────
  async list(
    orgId: string,
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.attendanceRegularizations.orgId, orgId),
      eq(schema.attendanceRegularizations.employeeId, userId),
    ];

    if (status) {
      conditions.push(eq(schema.attendanceRegularizations.status, status));
    }

    const rows = await this.db
      .select()
      .from(schema.attendanceRegularizations)
      .where(and(...conditions))
      .orderBy(desc(schema.attendanceRegularizations.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.attendanceRegularizations)
      .where(and(...conditions));

    return {
      regularizations: rows.map((r) => this.toDto(r)),
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    };
  }

  // ── Get Regularization Detail ─────────────────────────────────────────
  async getById(orgId: string, userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.attendanceRegularizations)
      .where(
        and(
          eq(schema.attendanceRegularizations.id, id),
          eq(schema.attendanceRegularizations.orgId, orgId),
          eq(schema.attendanceRegularizations.employeeId, userId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Regularization request not found');
    }

    // Resolve reviewer name
    let reviewerName: string | null = null;
    if (row.reviewedBy) {
      const [reviewer] = await this.db
        .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.id, row.reviewedBy))
        .limit(1);
      reviewerName = reviewer
        ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim()
        : null;
    }

    return {
      ...this.toDto(row),
      reviewerName,
    };
  }

  // ── Missed Punches Detection ──────────────────────────────────────────
  async getMissedPunches(orgId: string, userId: string, startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    // Get attendance records for the date range
    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      )
      .orderBy(desc(schema.attendanceRecords.date));

    // Get org config for work week
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekendDays: number[] = [];
    dayNames.forEach((day, index) => {
      if (workWeek[day] === 'off' || workWeek[day] === false) {
        weekendDays.push(index);
      }
    });

    // Get holidays
    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, startDate),
          lte(schema.holidayCalendars.date, endDate),
        ),
      );
    const holidayDates = new Set(holidays.map((h) => h.date));

    const recordMap = new Map(records.map((r) => [r.date, r]));
    const missedPunches: Record<string, any>[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end && d < today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay();

      // Skip weekends and holidays
      if (weekendDays.includes(dayOfWeek)) continue;
      if (holidayDates.has(dateStr)) continue;

      const record = recordMap.get(dateStr);

      if (!record) {
        // No record at all — both missing
        missedPunches.push({ date: dateStr, missingPunch: 'both' });
      } else if (record.clockIn && !record.clockOut) {
        missedPunches.push({ date: dateStr, missingPunch: 'clock_out' });
      } else if (!record.clockIn && record.clockOut) {
        missedPunches.push({ date: dateStr, missingPunch: 'clock_in' });
      }
    }

    return { missedPunches };
  }

  // ── Deadline Info ─────────────────────────────────────────────────────
  async getDeadline(orgId: string) {
    const policy = await this.getPolicy(orgId);
    const deadlineDays = policy?.regularizationDeadlineDays || 7;
    const approvalRequired = policy?.regularizationApprovalRequired ?? true;

    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - deadlineDays);

    return {
      deadlineDays,
      approvalRequired,
      earliestRegularizableDate: earliestDate.toISOString().slice(0, 10),
      message: `You can regularize attendance within ${deadlineDays} days from the date of absence/missing punch.`,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async getPolicy(orgId: string) {
    const [policy] = await this.db
      .select()
      .from(schema.attendancePolicies)
      .where(
        and(
          eq(schema.attendancePolicies.orgId, orgId),
          eq(schema.attendancePolicies.isDefault, true),
          eq(schema.attendancePolicies.isActive, true),
        ),
      )
      .limit(1);

    return policy || null;
  }

  private toDto(row: typeof schema.attendanceRegularizations.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      date: row.date,
      punchType: row.punchType,
      requestedTime: row.requestedTime.toISOString(),
      reason: row.reason,
      reasonCode: row.reasonCode,
      evidence: row.evidence,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() || null,
      reviewerComment: row.reviewerComment,
      slaDeadline: row.slaDeadline?.toISOString() || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
