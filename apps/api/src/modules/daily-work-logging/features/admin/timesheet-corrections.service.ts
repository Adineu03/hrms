import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TimesheetCorrectionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async adminOverride(
    orgId: string,
    data: Record<string, any>,
    adminUserId?: string,
  ) {
    const submissionId = data.submissionId;
    if (!submissionId) {
      throw new BadRequestException('submissionId is required');
    }

    const [existing] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Timesheet submission not found');

    // Store old values in metadata for audit trail
    const now = new Date();
    const oldValues: Record<string, any> = {};
    const updates: Record<string, any> = { updatedAt: now };

    const editableFields = [
      'status', 'totalHours', 'billableHours', 'nonBillableHours',
      'summaryNote', 'approverComment',
    ];

    for (const field of editableFields) {
      if (data[field] !== undefined) {
        oldValues[field] = (existing as any)[field];
        updates[field] = data[field];
      }
    }

    // If unlocking, clear the lock
    if (data.unlock === true && existing.lockedAt) {
      oldValues.lockedAt = existing.lockedAt?.toISOString() ?? null;
      oldValues.lockedBy = existing.lockedBy;
      updates.lockedAt = null;
      updates.lockedBy = null;
    }

    // If approving via override
    if (data.status === 'approved' && existing.status !== 'approved') {
      updates.approvedBy = adminUserId ?? null;
      updates.approvedAt = now;
    }

    // Append audit trail to metadata
    const existingMetadata = (existing.metadata as Record<string, any>) ?? {};
    const auditTrail = (existingMetadata.auditTrail as any[]) ?? [];
    auditTrail.push({
      action: 'admin_override',
      adminUserId: adminUserId ?? null,
      timestamp: now.toISOString(),
      oldValues,
      newValues: Object.fromEntries(
        Object.entries(updates).filter(([k]) => k !== 'updatedAt'),
      ),
      reason: data.reason ?? null,
    });
    updates.metadata = { ...existingMetadata, auditTrail };

    const [updated] = await this.db
      .update(schema.timesheetSubmissions)
      .set(updates)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
        ),
      )
      .returning();

    return this.toSubmissionDto(updated);
  }

  async bulkCorrect(
    orgId: string,
    data: Record<string, any>,
    adminUserId?: string,
  ) {
    const { entryIds, updates: corrections } = data;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      throw new BadRequestException('entryIds array is required and must not be empty');
    }

    const now = new Date();
    const results: string[] = [];
    const errors: { entryId: string; error: string }[] = [];

    await this.db.transaction(async (tx) => {
      for (const entryId of entryIds) {
        const [existing] = await tx
          .select()
          .from(schema.timesheetEntries)
          .where(
            and(
              eq(schema.timesheetEntries.id, entryId),
              eq(schema.timesheetEntries.orgId, orgId),
            ),
          )
          .limit(1);

        if (!existing) {
          errors.push({ entryId, error: 'Entry not found' });
          continue;
        }

        // Check if submission is locked
        if (existing.submissionId) {
          const [submission] = await tx
            .select()
            .from(schema.timesheetSubmissions)
            .where(
              and(
                eq(schema.timesheetSubmissions.id, existing.submissionId),
                eq(schema.timesheetSubmissions.orgId, orgId),
              ),
            )
            .limit(1);

          if (submission && submission.lockedAt) {
            errors.push({ entryId, error: 'Entry belongs to a locked submission' });
            continue;
          }
        }

        // Build audit trail
        const oldValues: Record<string, any> = {};
        const setFields: Record<string, any> = { updatedAt: now };

        const editableFields = [
          'hours', 'description', 'projectId', 'taskCategoryId',
          'isBillable', 'startTime', 'endTime', 'status',
        ];

        for (const field of editableFields) {
          if (corrections[field] !== undefined) {
            oldValues[field] = (existing as any)[field];
            setFields[field] = corrections[field];
          }
        }

        const existingMetadata = (existing.metadata as Record<string, any>) ?? {};
        const auditTrail = (existingMetadata.auditTrail as any[]) ?? [];
        auditTrail.push({
          action: 'bulk_correction',
          adminUserId: adminUserId ?? null,
          timestamp: now.toISOString(),
          oldValues,
          newValues: Object.fromEntries(
            Object.entries(setFields).filter(([k]) => k !== 'updatedAt'),
          ),
          reason: data.reason ?? null,
        });
        setFields.metadata = { ...existingMetadata, auditTrail };

        await tx
          .update(schema.timesheetEntries)
          .set(setFields)
          .where(
            and(
              eq(schema.timesheetEntries.id, entryId),
              eq(schema.timesheetEntries.orgId, orgId),
            ),
          );

        results.push(entryId);
      }
    });

    return {
      success: true,
      corrected: results.length,
      errors: errors.length > 0 ? errors : undefined,
      entryIds: results,
    };
  }

  async lockPeriod(
    orgId: string,
    data: Record<string, any>,
    adminUserId?: string,
  ) {
    const { periodStart, periodEnd, action } = data;

    if (!periodStart || !periodEnd) {
      throw new BadRequestException('periodStart and periodEnd are required');
    }

    const lockAction = action ?? 'lock'; // 'lock' or 'unlock'
    const now = new Date();

    if (lockAction === 'lock') {
      const result = await this.db
        .update(schema.timesheetSubmissions)
        .set({
          lockedAt: now,
          lockedBy: adminUserId ?? null,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.timesheetSubmissions.orgId, orgId),
            gte(schema.timesheetSubmissions.periodStart, periodStart),
            lte(schema.timesheetSubmissions.periodEnd, periodEnd),
            sql`${schema.timesheetSubmissions.lockedAt} IS NULL`,
          ),
        )
        .returning({ id: schema.timesheetSubmissions.id });

      return {
        success: true,
        action: 'lock',
        lockedCount: result.length,
        period: { periodStart, periodEnd },
      };
    } else {
      // unlock
      const result = await this.db
        .update(schema.timesheetSubmissions)
        .set({
          lockedAt: null,
          lockedBy: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.timesheetSubmissions.orgId, orgId),
            gte(schema.timesheetSubmissions.periodStart, periodStart),
            lte(schema.timesheetSubmissions.periodEnd, periodEnd),
            sql`${schema.timesheetSubmissions.lockedAt} IS NOT NULL`,
          ),
        )
        .returning({ id: schema.timesheetSubmissions.id });

      return {
        success: true,
        action: 'unlock',
        unlockedCount: result.length,
        period: { periodStart, periodEnd },
      };
    }
  }

  async getAuditTrail(
    orgId: string,
    filters: {
      submissionId?: string;
      employeeId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    // Fetch submissions that have audit trail in their metadata
    const conditions: any[] = [eq(schema.timesheetSubmissions.orgId, orgId)];

    if (filters.submissionId) {
      conditions.push(eq(schema.timesheetSubmissions.id, filters.submissionId));
    }
    if (filters.employeeId) {
      conditions.push(eq(schema.timesheetSubmissions.employeeId, filters.employeeId));
    }
    if (filters.startDate) {
      conditions.push(gte(schema.timesheetSubmissions.periodStart, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(schema.timesheetSubmissions.periodEnd, filters.endDate));
    }

    const submissions = await this.db
      .select({
        submission: schema.timesheetSubmissions,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
      })
      .from(schema.timesheetSubmissions)
      .leftJoin(
        schema.users,
        and(
          eq(schema.timesheetSubmissions.employeeId, schema.users.id),
          eq(schema.timesheetSubmissions.orgId, schema.users.orgId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.timesheetSubmissions.updatedAt));

    // Extract audit trail from metadata
    const auditEntries = submissions
      .filter((r) => {
        const meta = r.submission.metadata as Record<string, any>;
        return meta?.auditTrail && Array.isArray(meta.auditTrail) && meta.auditTrail.length > 0;
      })
      .map((r) => {
        const meta = r.submission.metadata as Record<string, any>;
        return {
          submissionId: r.submission.id,
          employeeId: r.submission.employeeId,
          employee: {
            id: r.submission.employeeId,
            firstName: r.employeeFirstName,
            lastName: r.employeeLastName,
            email: r.employeeEmail,
          },
          periodStart: r.submission.periodStart,
          periodEnd: r.submission.periodEnd,
          auditTrail: meta.auditTrail,
        };
      });

    // Also check timesheet entries for audit trail
    const entryConditions: any[] = [eq(schema.timesheetEntries.orgId, orgId)];

    if (filters.employeeId) {
      entryConditions.push(eq(schema.timesheetEntries.employeeId, filters.employeeId));
    }
    if (filters.startDate) {
      entryConditions.push(gte(schema.timesheetEntries.date, filters.startDate));
    }
    if (filters.endDate) {
      entryConditions.push(lte(schema.timesheetEntries.date, filters.endDate));
    }

    const entries = await this.db
      .select({
        entry: schema.timesheetEntries,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
      })
      .from(schema.timesheetEntries)
      .leftJoin(
        schema.users,
        and(
          eq(schema.timesheetEntries.employeeId, schema.users.id),
          eq(schema.timesheetEntries.orgId, schema.users.orgId),
        ),
      )
      .where(and(...entryConditions))
      .orderBy(desc(schema.timesheetEntries.updatedAt))
      .limit(200);

    const entryAuditEntries = entries
      .filter((r) => {
        const meta = r.entry.metadata as Record<string, any>;
        return meta?.auditTrail && Array.isArray(meta.auditTrail) && meta.auditTrail.length > 0;
      })
      .map((r) => {
        const meta = r.entry.metadata as Record<string, any>;
        return {
          entryId: r.entry.id,
          employeeId: r.entry.employeeId,
          employee: {
            id: r.entry.employeeId,
            firstName: r.employeeFirstName,
            lastName: r.employeeLastName,
          },
          date: r.entry.date,
          auditTrail: meta.auditTrail,
        };
      });

    return {
      submissions: auditEntries,
      entries: entryAuditEntries,
    };
  }

  async resolveDispute(
    orgId: string,
    data: Record<string, any>,
    adminUserId?: string,
  ) {
    const { submissionId, resolution, comment } = data;

    if (!submissionId) {
      throw new BadRequestException('submissionId is required');
    }
    if (!resolution) {
      throw new BadRequestException('resolution is required (accepted, rejected, modified)');
    }

    const [existing] = await this.db
      .select()
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Timesheet submission not found');

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };

    // Resolve based on the resolution type
    if (resolution === 'accepted') {
      // Accept the employee's original submission
      updates.status = 'approved';
      updates.approvedBy = adminUserId ?? null;
      updates.approvedAt = now;
      updates.approverComment = comment ?? 'Dispute resolved - employee submission accepted';
      // Clear rejection fields
      updates.rejectedAt = null;
      updates.rejectionReason = null;
    } else if (resolution === 'rejected') {
      // Reject the dispute, maintain the current state
      updates.approverComment = comment ?? 'Dispute rejected by admin';
    } else if (resolution === 'modified') {
      // Admin modifies and approves
      if (data.totalHours !== undefined) updates.totalHours = data.totalHours;
      if (data.billableHours !== undefined) updates.billableHours = data.billableHours;
      if (data.nonBillableHours !== undefined) updates.nonBillableHours = data.nonBillableHours;
      updates.status = 'approved';
      updates.approvedBy = adminUserId ?? null;
      updates.approvedAt = now;
      updates.approverComment = comment ?? 'Dispute resolved with modifications';
      // Clear rejection fields
      updates.rejectedAt = null;
      updates.rejectionReason = null;
    }

    // Add audit trail entry
    const existingMetadata = (existing.metadata as Record<string, any>) ?? {};
    const auditTrail = (existingMetadata.auditTrail as any[]) ?? [];
    auditTrail.push({
      action: 'dispute_resolution',
      resolution,
      adminUserId: adminUserId ?? null,
      timestamp: now.toISOString(),
      comment: comment ?? null,
      previousStatus: existing.status,
    });
    updates.metadata = { ...existingMetadata, auditTrail };

    const [updated] = await this.db
      .update(schema.timesheetSubmissions)
      .set(updates)
      .where(
        and(
          eq(schema.timesheetSubmissions.id, submissionId),
          eq(schema.timesheetSubmissions.orgId, orgId),
        ),
      )
      .returning();

    return this.toSubmissionDto(updated);
  }

  private toSubmissionDto(row: typeof schema.timesheetSubmissions.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      totalHours: row.totalHours,
      billableHours: row.billableHours,
      nonBillableHours: row.nonBillableHours,
      status: row.status,
      summaryNote: row.summaryNote,
      approvalChain: row.approvalChain,
      currentApproverLevel: row.currentApproverLevel,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      approverComment: row.approverComment,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      rejectionReason: row.rejectionReason,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      lockedAt: row.lockedAt?.toISOString() ?? null,
      lockedBy: row.lockedBy,
      dayBreakdown: row.dayBreakdown,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
