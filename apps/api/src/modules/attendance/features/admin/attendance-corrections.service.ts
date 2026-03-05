import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class AttendanceCorrectionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listRecords(
    orgId: string,
    filters: {
      date?: string;
      employeeId?: string;
      status?: string;
      departmentId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const conditions: any[] = [eq(schema.attendanceRecords.orgId, orgId)];

    if (filters.date) {
      conditions.push(eq(schema.attendanceRecords.date, filters.date));
    }
    if (filters.employeeId) {
      conditions.push(eq(schema.attendanceRecords.employeeId, filters.employeeId));
    }
    if (filters.status) {
      conditions.push(eq(schema.attendanceRecords.status, filters.status));
    }

    const rows = await this.db
      .select({
        record: schema.attendanceRecords,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
        departmentId: schema.employeeProfiles.departmentId,
      })
      .from(schema.attendanceRecords)
      .leftJoin(
        schema.users,
        and(
          eq(schema.attendanceRecords.employeeId, schema.users.id),
          eq(schema.attendanceRecords.orgId, schema.users.orgId),
        ),
      )
      .leftJoin(
        schema.employeeProfiles,
        and(
          eq(schema.attendanceRecords.employeeId, schema.employeeProfiles.userId),
          eq(schema.attendanceRecords.orgId, schema.employeeProfiles.orgId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.attendanceRecords.date));

    // Filter by department in-memory
    let filtered = rows;
    if (filters.departmentId) {
      filtered = filtered.filter((r) => r.departmentId === filters.departmentId);
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => ({
        ...this.toRecordDto(r.record),
        employee: {
          id: r.record.employeeId,
          firstName: r.employeeFirstName,
          lastName: r.employeeLastName,
          email: r.employeeEmail,
        },
        departmentId: r.departmentId,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminOverride(orgId: string, recordId: string, data: Record<string, any>, adminUserId?: string) {
    const [existing] = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.id, recordId),
          eq(schema.attendanceRecords.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Attendance record not found');

    if (existing.isLocked) {
      throw new BadRequestException('Cannot modify a locked attendance record');
    }

    // Store old values in metadata for audit trail
    const oldValues: Record<string, any> = {};
    const updates: Record<string, any> = { updatedAt: new Date() };

    const editableFields = [
      'status', 'clockIn', 'clockOut', 'lateMinutes', 'earlyDepartureMinutes',
      'totalWorkMinutes', 'totalBreakMinutes', 'overtimeMinutes',
      'isHalfDay', 'isOvertime', 'remarks',
    ];

    for (const field of editableFields) {
      if (data[field] !== undefined) {
        oldValues[field] = (existing as any)[field];
        updates[field] = data[field];
      }
    }

    // Append audit trail to existing metadata
    const existingMetadata = (existing.metadata as Record<string, any>) ?? {};
    const auditTrail = (existingMetadata.auditTrail as any[]) ?? [];
    auditTrail.push({
      action: 'admin_override',
      adminUserId: adminUserId ?? null,
      timestamp: new Date().toISOString(),
      oldValues,
      newValues: Object.fromEntries(
        Object.entries(updates).filter(([k]) => k !== 'updatedAt'),
      ),
      reason: data.reason ?? null,
    });
    updates.metadata = { ...existingMetadata, auditTrail };

    const [updated] = await this.db
      .update(schema.attendanceRecords)
      .set(updates)
      .where(
        and(
          eq(schema.attendanceRecords.id, recordId),
          eq(schema.attendanceRecords.orgId, orgId),
        ),
      )
      .returning();

    return this.toRecordDto(updated);
  }

  async bulkCorrect(
    orgId: string,
    recordIds: string[],
    updates: Record<string, any>,
    adminUserId?: string,
  ) {
    if (!recordIds || recordIds.length === 0) {
      throw new BadRequestException('At least one recordId is required');
    }

    const now = new Date();
    const results: string[] = [];
    const errors: { recordId: string; error: string }[] = [];

    await this.db.transaction(async (tx) => {
      for (const recordId of recordIds) {
        const [existing] = await tx
          .select()
          .from(schema.attendanceRecords)
          .where(
            and(
              eq(schema.attendanceRecords.id, recordId),
              eq(schema.attendanceRecords.orgId, orgId),
            ),
          )
          .limit(1);

        if (!existing) {
          errors.push({ recordId, error: 'Record not found' });
          continue;
        }

        if (existing.isLocked) {
          errors.push({ recordId, error: 'Record is locked' });
          continue;
        }

        // Build audit trail
        const oldValues: Record<string, any> = {};
        const setFields: Record<string, any> = { updatedAt: now };

        const editableFields = ['status', 'clockIn', 'clockOut', 'remarks'];
        for (const field of editableFields) {
          if (updates[field] !== undefined) {
            oldValues[field] = (existing as any)[field];
            setFields[field] = updates[field];
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
          reason: updates.remarks ?? null,
        });
        setFields.metadata = { ...existingMetadata, auditTrail };

        await tx
          .update(schema.attendanceRecords)
          .set(setFields)
          .where(
            and(
              eq(schema.attendanceRecords.id, recordId),
              eq(schema.attendanceRecords.orgId, orgId),
            ),
          );

        results.push(recordId);
      }
    });

    return {
      success: true,
      corrected: results.length,
      errors: errors.length > 0 ? errors : undefined,
      recordIds: results,
    };
  }

  async listRegularizations(orgId: string) {
    const rows = await this.db
      .select({
        regularization: schema.attendanceRegularizations,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
      })
      .from(schema.attendanceRegularizations)
      .leftJoin(
        schema.users,
        and(
          eq(schema.attendanceRegularizations.employeeId, schema.users.id),
          eq(schema.attendanceRegularizations.orgId, schema.users.orgId),
        ),
      )
      .where(
        and(
          eq(schema.attendanceRegularizations.orgId, orgId),
          eq(schema.attendanceRegularizations.status, 'pending'),
        ),
      )
      .orderBy(desc(schema.attendanceRegularizations.createdAt));

    return rows.map((r) => ({
      ...this.toRegularizationDto(r.regularization),
      employee: {
        id: r.regularization.employeeId,
        firstName: r.employeeFirstName,
        lastName: r.employeeLastName,
        email: r.employeeEmail,
      },
    }));
  }

  async reviewRegularization(
    orgId: string,
    regularizationId: string,
    data: Record<string, any>,
    adminUserId?: string,
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.attendanceRegularizations)
      .where(
        and(
          eq(schema.attendanceRegularizations.id, regularizationId),
          eq(schema.attendanceRegularizations.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Regularization request not found');

    if (existing.status !== 'pending' && existing.status !== 'manager_approved') {
      throw new BadRequestException(
        `Cannot review a regularization with status "${existing.status}"`,
      );
    }

    const validStatuses = ['approved', 'rejected'];
    if (!data.status || !validStatuses.includes(data.status)) {
      throw new BadRequestException('status must be "approved" or "rejected"');
    }

    const now = new Date();

    const [updated] = await this.db
      .update(schema.attendanceRegularizations)
      .set({
        status: data.status,
        reviewedBy: adminUserId ?? null,
        reviewedAt: now,
        reviewerComment: data.comment ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.attendanceRegularizations.id, regularizationId),
          eq(schema.attendanceRegularizations.orgId, orgId),
        ),
      )
      .returning();

    // If approved, update the corresponding attendance record
    if (data.status === 'approved') {
      const updateFields: Record<string, any> = {
        isRegularized: true,
        updatedAt: now,
      };

      // Apply the requested time as clock-in or clock-out based on punch type
      if (existing.punchType === 'clock_in') {
        updateFields.clockIn = existing.requestedTime;
      } else if (existing.punchType === 'clock_out') {
        updateFields.clockOut = existing.requestedTime;
      }

      await this.db
        .update(schema.attendanceRecords)
        .set(updateFields)
        .where(
          and(
            eq(schema.attendanceRecords.orgId, orgId),
            eq(schema.attendanceRecords.employeeId, existing.employeeId),
            eq(schema.attendanceRecords.date, existing.date),
          ),
        );
    }

    return this.toRegularizationDto(updated);
  }

  async lockRecords(orgId: string, month: number, year: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year');
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    const result = await this.db
      .update(schema.attendanceRecords)
      .set({ isLocked: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
          eq(schema.attendanceRecords.isLocked, false),
        ),
      )
      .returning({ id: schema.attendanceRecords.id });

    return {
      success: true,
      lockedCount: result.length,
      period: { month, year, startDate, endDate },
    };
  }

  private toRecordDto(row: typeof schema.attendanceRecords.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      date: row.date,
      shiftId: row.shiftId,
      clockIn: row.clockIn?.toISOString() ?? null,
      clockOut: row.clockOut?.toISOString() ?? null,
      clockInMethod: row.clockInMethod,
      clockOutMethod: row.clockOutMethod,
      clockInLocation: row.clockInLocation,
      clockOutLocation: row.clockOutLocation,
      status: row.status,
      lateMinutes: row.lateMinutes,
      earlyDepartureMinutes: row.earlyDepartureMinutes,
      totalWorkMinutes: row.totalWorkMinutes,
      totalBreakMinutes: row.totalBreakMinutes,
      overtimeMinutes: row.overtimeMinutes,
      isHalfDay: row.isHalfDay,
      isOvertime: row.isOvertime,
      isRegularized: row.isRegularized,
      isLocked: row.isLocked,
      remarks: row.remarks,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toRegularizationDto(row: typeof schema.attendanceRegularizations.$inferSelect) {
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
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewerComment: row.reviewerComment,
      slaDeadline: row.slaDeadline?.toISOString() ?? null,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
