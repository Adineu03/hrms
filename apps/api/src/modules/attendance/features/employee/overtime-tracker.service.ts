import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OvertimeTrackerService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── OT Summary ────────────────────────────────────────────────────────
  async getSummary(orgId: string, userId: string, period: string) {
    const now = new Date();
    let startDate: string;
    let endDate: string = now.toISOString().slice(0, 10);

    switch (period) {
      case 'daily':
        startDate = endDate;
        break;
      case 'weekly': {
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        startDate = weekStart.toISOString().slice(0, 10);
        break;
      }
      case 'ytd':
        startDate = `${now.getFullYear()}-01-01`;
        break;
      case 'monthly':
      default: {
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        break;
      }
    }

    // Get OT from attendance records
    const attendanceRecords = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    let totalOtMinutes = 0;
    for (const r of attendanceRecords) {
      totalOtMinutes += r.overtimeMinutes || 0;
    }

    // Get OT requests
    const otRequests = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.employeeId, userId),
          gte(schema.overtimeRequests.date, startDate),
          lte(schema.overtimeRequests.date, endDate),
        ),
      );

    let approvedHours = 0;
    let pendingHours = 0;
    let compOffBalance = 0;

    for (const req of otRequests) {
      const hours = req.actualHours || req.estimatedHours || 0;
      if (req.status === 'approved') {
        approvedHours += hours;
        if (req.compOffEligible === 'yes') {
          compOffBalance += hours;
        }
      } else if (req.status === 'pending') {
        pendingHours += hours;
      }
    }

    return {
      period,
      startDate,
      endDate,
      totalOtHours: Math.round((totalOtMinutes / 60) * 10) / 10,
      approvedHours,
      pendingHours,
      compOffBalance,
      totalRequests: otRequests.length,
    };
  }

  // ── Submit OT Request ─────────────────────────────────────────────────
  async submitRequest(orgId: string, userId: string, data: Record<string, any>) {
    if (!data.date || !data.type || !data.reason) {
      throw new BadRequestException('date, type, and reason are required');
    }

    const validTypes = ['pre_approval', 'post_facto'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException('type must be pre_approval or post_facto');
    }

    // Validate against policy limits
    const policy = await this.getOtPolicy(orgId);

    if (policy && !policy.overtimeEnabled) {
      throw new BadRequestException('Overtime is not enabled for your organization');
    }

    // Check daily limit
    if (policy && data.estimatedHours && data.estimatedHours > (policy.maxOvertimePerDay || 4)) {
      throw new BadRequestException(
        `Estimated hours exceed daily limit of ${policy.maxOvertimePerDay || 4} hours`,
      );
    }

    // Check for duplicate request
    const [existingReq] = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.employeeId, userId),
          eq(schema.overtimeRequests.date, data.date),
          eq(schema.overtimeRequests.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingReq) {
      throw new BadRequestException('An overtime request already exists for this date');
    }

    const [created] = await this.db
      .insert(schema.overtimeRequests)
      .values({
        orgId,
        employeeId: userId,
        date: data.date,
        type: data.type,
        estimatedHours: data.estimatedHours || null,
        actualHours: data.actualHours || null,
        reason: data.reason,
        reasonCode: data.reasonCode || null,
        status: 'pending',
        overtimeRate: (policy?.overtimeRates as any)?.defaultRate || null,
      })
      .returning();

    return this.toDto(created);
  }

  // ── List OT Requests ──────────────────────────────────────────────────
  async listRequests(
    orgId: string,
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.overtimeRequests.orgId, orgId),
      eq(schema.overtimeRequests.employeeId, userId),
    ];

    if (status) {
      conditions.push(eq(schema.overtimeRequests.status, status));
    }

    const rows = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(and(...conditions))
      .orderBy(desc(schema.overtimeRequests.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const [countResult] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.overtimeRequests)
      .where(and(...conditions));

    return {
      requests: rows.map((r) => this.toDto(r)),
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    };
  }

  // ── Get OT Request Detail ─────────────────────────────────────────────
  async getRequest(orgId: string, userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.id, id),
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.employeeId, userId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Overtime request not found');
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

  // ── OT Policy ─────────────────────────────────────────────────────────
  async getPolicy(orgId: string) {
    const policy = await this.getOtPolicy(orgId);

    if (!policy) {
      return {
        overtimeEnabled: false,
        maxOvertimePerDay: 0,
        maxOvertimePerWeek: 0,
        maxOvertimePerMonth: 0,
        rates: {},
        approvalType: 'pre_approval',
        compOffRules: {},
      };
    }

    return {
      overtimeEnabled: policy.overtimeEnabled,
      maxOvertimePerDay: policy.maxOvertimePerDay,
      maxOvertimePerWeek: policy.maxOvertimePerWeek,
      maxOvertimePerMonth: policy.maxOvertimePerMonth,
      rates: policy.overtimeRates || {},
      approvalType: policy.overtimeApprovalType,
      compOffRules: policy.compOffConversionRules || {},
    };
  }

  // ── OT Trends ─────────────────────────────────────────────────────────
  async getTrends(orgId: string, userId: string, months: number) {
    const now = new Date();
    const trends: Record<string, any>[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetDate.getMonth() + 1;
      const y = targetDate.getFullYear();
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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
        );

      let otMinutes = 0;
      let otDays = 0;
      for (const r of records) {
        if (r.overtimeMinutes && r.overtimeMinutes > 0) {
          otMinutes += r.overtimeMinutes;
          otDays++;
        }
      }

      trends.push({
        month: `${y}-${String(m).padStart(2, '0')}`,
        monthName: targetDate.toLocaleString('default', { month: 'long' }),
        year: y,
        otHours: Math.round((otMinutes / 60) * 10) / 10,
        otDays,
      });
    }

    return { trends };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async getOtPolicy(orgId: string) {
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

  private toDto(row: typeof schema.overtimeRequests.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      date: row.date,
      type: row.type,
      estimatedHours: row.estimatedHours,
      actualHours: row.actualHours,
      reason: row.reason,
      reasonCode: row.reasonCode,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() || null,
      reviewerComment: row.reviewerComment,
      overtimeRate: row.overtimeRate,
      compOffEligible: row.compOffEligible,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
