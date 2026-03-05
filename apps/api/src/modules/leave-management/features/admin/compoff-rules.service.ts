import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CompoffRulesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listRecords(
    orgId: string,
    filters: {
      status?: string;
      employeeId?: string;
      departmentId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const conditions: any[] = [eq(schema.compOffRecords.orgId, orgId)];

    if (filters.status) {
      conditions.push(eq(schema.compOffRecords.status, filters.status));
    }
    if (filters.employeeId) {
      conditions.push(eq(schema.compOffRecords.employeeId, filters.employeeId));
    }

    const rows = await this.db
      .select({
        record: schema.compOffRecords,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
        departmentId: schema.employeeProfiles.departmentId,
        departmentName: schema.departments.name,
      })
      .from(schema.compOffRecords)
      .leftJoin(
        schema.users,
        and(
          eq(schema.compOffRecords.employeeId, schema.users.id),
          eq(schema.compOffRecords.orgId, schema.users.orgId),
        ),
      )
      .leftJoin(
        schema.employeeProfiles,
        and(
          eq(schema.compOffRecords.employeeId, schema.employeeProfiles.userId),
          eq(schema.compOffRecords.orgId, schema.employeeProfiles.orgId),
        ),
      )
      .leftJoin(
        schema.departments,
        and(
          eq(schema.employeeProfiles.departmentId, schema.departments.id),
          eq(schema.employeeProfiles.orgId, schema.departments.orgId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.compOffRecords.createdAt));

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
        ...this.toCompOffDto(r.record),
        employee: {
          id: r.record.employeeId,
          firstName: r.employeeFirstName,
          lastName: r.employeeLastName,
          email: r.employeeEmail,
        },
        departmentId: r.departmentId,
        departmentName: r.departmentName,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRecord(orgId: string, id: string) {
    const [row] = await this.db
      .select({
        record: schema.compOffRecords,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
      })
      .from(schema.compOffRecords)
      .leftJoin(
        schema.users,
        and(
          eq(schema.compOffRecords.employeeId, schema.users.id),
          eq(schema.compOffRecords.orgId, schema.users.orgId),
        ),
      )
      .where(
        and(
          eq(schema.compOffRecords.id, id),
          eq(schema.compOffRecords.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Comp-off record not found');

    return {
      ...this.toCompOffDto(row.record),
      employee: {
        id: row.record.employeeId,
        firstName: row.employeeFirstName,
        lastName: row.employeeLastName,
        email: row.employeeEmail,
      },
    };
  }

  async reviewRecord(
    orgId: string,
    id: string,
    data: Record<string, any>,
    adminUserId?: string,
  ) {
    const [existing] = await this.db
      .select()
      .from(schema.compOffRecords)
      .where(
        and(
          eq(schema.compOffRecords.id, id),
          eq(schema.compOffRecords.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Comp-off record not found');

    const validStatuses = ['approved', 'rejected', 'expired'];
    if (!data.status || !validStatuses.includes(data.status)) {
      throw new BadRequestException(
        'status must be "approved", "rejected", or "expired"',
      );
    }

    const now = new Date();
    const updates: Record<string, any> = {
      status: data.status,
      updatedAt: now,
    };

    if (data.status === 'approved') {
      updates.approvedBy = adminUserId ?? null;
      updates.approvedAt = now;
    }

    // Store review comment in metadata
    if (data.comment) {
      const existingMetadata = (existing.metadata as Record<string, any>) ?? {};
      updates.metadata = {
        ...existingMetadata,
        reviewComment: data.comment,
        reviewedBy: adminUserId ?? null,
        reviewedAt: now.toISOString(),
      };
    }

    const [updated] = await this.db
      .update(schema.compOffRecords)
      .set(updates)
      .where(
        and(
          eq(schema.compOffRecords.id, id),
          eq(schema.compOffRecords.orgId, orgId),
        ),
      )
      .returning();

    return this.toCompOffDto(updated);
  }

  async getRules(orgId: string) {
    // Get comp-off rules from the default leave policy
    const [policy] = await this.db
      .select({
        compOffEarningRules: schema.leavePolicies.compOffEarningRules,
        compOffExpiryDays: schema.leavePolicies.compOffExpiryDays,
      })
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!policy) {
      return {
        data: null,
        message: 'No leave policy configured yet. Configure a leave policy first.',
      };
    }

    return {
      compOffEarningRules: policy.compOffEarningRules,
      compOffExpiryDays: policy.compOffExpiryDays,
    };
  }

  async updateRules(orgId: string, data: Record<string, any>) {
    // Update comp-off rules in the default leave policy
    const [existing] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new BadRequestException(
        'No leave policy configured yet. Configure a leave policy first.',
      );
    }

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (data.compOffEarningRules !== undefined) {
      updates.compOffEarningRules = data.compOffEarningRules;
    }
    if (data.compOffExpiryDays !== undefined) {
      updates.compOffExpiryDays = data.compOffExpiryDays;
    }

    const [updated] = await this.db
      .update(schema.leavePolicies)
      .set(updates)
      .where(
        and(
          eq(schema.leavePolicies.id, existing.id),
          eq(schema.leavePolicies.orgId, orgId),
        ),
      )
      .returning();

    return {
      compOffEarningRules: updated.compOffEarningRules,
      compOffExpiryDays: updated.compOffExpiryDays,
    };
  }

  async getSpecialLeaveTypes(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      )
      .orderBy(schema.leaveTypes.name);

    // Filter for special leave types: comp-off or gender-specific
    const specialTypes = rows.filter(
      (r) => r.isCompOff || r.applicableGender !== null,
    );

    return specialTypes.map((r) => this.toLeaveTypeDto(r));
  }

  private toCompOffDto(row: typeof schema.compOffRecords.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      earnedDate: row.earnedDate,
      reason: row.reason,
      workType: row.workType,
      daysEarned: Number(row.daysEarned),
      daysUsed: Number(row.daysUsed),
      daysAvailable: Number(row.daysAvailable),
      expiryDate: row.expiryDate,
      status: row.status,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      linkedLeaveRequestId: row.linkedLeaveRequestId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toLeaveTypeDto(row: typeof schema.leaveTypes.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      code: row.code,
      isPaid: row.isPaid,
      accrualRule: row.accrualRule,
      daysPerYear: Number(row.daysPerYear),
      maxAccrualPerPeriod: row.maxAccrualPerPeriod ? Number(row.maxAccrualPerPeriod) : null,
      carryForwardEnabled: row.carryForwardEnabled,
      maxCarryForwardDays: row.maxCarryForwardDays,
      carryForwardExpiryMonths: row.carryForwardExpiryMonths,
      encashmentEnabled: row.encashmentEnabled,
      maxEncashableDays: row.maxEncashableDays,
      probationAllowed: row.probationAllowed,
      probationDaysPerYear: row.probationDaysPerYear,
      minConsecutiveDays: row.minConsecutiveDays,
      maxConsecutiveDays: row.maxConsecutiveDays,
      requiresApproval: row.requiresApproval,
      requiresDocument: row.requiresDocument,
      documentThresholdDays: row.documentThresholdDays,
      applicableGender: row.applicableGender,
      isCompOff: row.isCompOff,
      color: row.color,
      metadata: row.metadata,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
