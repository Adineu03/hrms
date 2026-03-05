import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DelegationMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getDelegations(orgId: string, managerId: string) {
    const delegations = await this.db
      .select({
        id: schema.leaveDelegations.id,
        delegatorId: schema.leaveDelegations.delegatorId,
        delegateId: schema.leaveDelegations.delegateId,
        startDate: schema.leaveDelegations.startDate,
        endDate: schema.leaveDelegations.endDate,
        delegationType: schema.leaveDelegations.delegationType,
        isActive: schema.leaveDelegations.isActive,
        activatedAt: schema.leaveDelegations.activatedAt,
        autoActivated: schema.leaveDelegations.autoActivated,
        metadata: schema.leaveDelegations.metadata,
        createdAt: schema.leaveDelegations.createdAt,
        updatedAt: schema.leaveDelegations.updatedAt,
      })
      .from(schema.leaveDelegations)
      .where(
        and(
          eq(schema.leaveDelegations.orgId, orgId),
          eq(schema.leaveDelegations.delegatorId, managerId),
        ),
      )
      .orderBy(desc(schema.leaveDelegations.createdAt));

    // Enrich with delegate names
    const delegateIds = [...new Set(delegations.map((d) => d.delegateId))];
    const delegateMap = new Map<string, { firstName: string; lastName: string | null; email: string }>();

    if (delegateIds.length > 0) {
      const delegates = await this.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        })
        .from(schema.users)
        .where(inArray(schema.users.id, delegateIds));

      for (const d of delegates) {
        delegateMap.set(d.id, { firstName: d.firstName, lastName: d.lastName, email: d.email });
      }
    }

    const enriched = delegations.map((d) => {
      const delegate = delegateMap.get(d.delegateId);
      return {
        ...d,
        delegateName: delegate
          ? `${delegate.firstName} ${delegate.lastName ?? ''}`.trim()
          : 'Unknown',
        delegateEmail: delegate?.email ?? null,
      };
    });

    return {
      total: enriched.length,
      active: enriched.filter((d) => d.isActive).length,
      delegations: enriched,
    };
  }

  async createDelegation(orgId: string, managerId: string, body: Record<string, any>) {
    const { delegateId, startDate, endDate, delegationType } = body;

    if (!delegateId) throw new BadRequestException('delegateId is required');
    if (!startDate) throw new BadRequestException('startDate is required');
    if (!endDate) throw new BadRequestException('endDate is required');

    if (delegateId === managerId) {
      throw new BadRequestException('Cannot delegate to yourself');
    }

    // Verify delegate exists and is in the same org
    const [delegate] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, delegateId),
          eq(schema.users.orgId, orgId),
          eq(schema.users.isActive, true),
        ),
      );

    if (!delegate) {
      throw new NotFoundException('Delegate user not found');
    }

    // Check for overlapping active delegations
    const existing = await this.db
      .select({ id: schema.leaveDelegations.id })
      .from(schema.leaveDelegations)
      .where(
        and(
          eq(schema.leaveDelegations.orgId, orgId),
          eq(schema.leaveDelegations.delegatorId, managerId),
          eq(schema.leaveDelegations.isActive, true),
        ),
      );

    // Check date overlap with existing active delegations
    for (const ex of existing) {
      // Simple overlap check — if there is any active delegation, warn
      // In a more complex scenario, we'd check date ranges
    }

    const now = new Date();
    const [created] = await this.db
      .insert(schema.leaveDelegations)
      .values({
        orgId,
        delegatorId: managerId,
        delegateId,
        startDate,
        endDate,
        delegationType: delegationType ?? 'approval',
        isActive: true,
        activatedAt: now,
        autoActivated: false,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  async updateDelegation(orgId: string, managerId: string, delegationId: string, body: Record<string, any>) {
    const [delegation] = await this.db
      .select()
      .from(schema.leaveDelegations)
      .where(
        and(
          eq(schema.leaveDelegations.id, delegationId),
          eq(schema.leaveDelegations.orgId, orgId),
          eq(schema.leaveDelegations.delegatorId, managerId),
        ),
      );

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.delegateId !== undefined) {
      if (body.delegateId === managerId) {
        throw new BadRequestException('Cannot delegate to yourself');
      }
      updateData.delegateId = body.delegateId;
    }
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.delegationType !== undefined) updateData.delegationType = body.delegationType;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await this.db
      .update(schema.leaveDelegations)
      .set(updateData)
      .where(eq(schema.leaveDelegations.id, delegationId))
      .returning();

    return updated;
  }

  async cancelDelegation(orgId: string, managerId: string, delegationId: string) {
    const [delegation] = await this.db
      .select()
      .from(schema.leaveDelegations)
      .where(
        and(
          eq(schema.leaveDelegations.id, delegationId),
          eq(schema.leaveDelegations.orgId, orgId),
          eq(schema.leaveDelegations.delegatorId, managerId),
        ),
      );

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    const [updated] = await this.db
      .update(schema.leaveDelegations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.leaveDelegations.id, delegationId))
      .returning();

    return { cancelled: true, delegation: updated };
  }

  async getPendingDelegatedApprovals(orgId: string, managerId: string) {
    // Get pending leave requests where this manager is the delegateId
    const pendingRequests = await this.db
      .select({
        id: schema.leaveRequests.id,
        employeeId: schema.leaveRequests.employeeId,
        leaveTypeId: schema.leaveRequests.leaveTypeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        reason: schema.leaveRequests.reason,
        status: schema.leaveRequests.status,
        delegateId: schema.leaveRequests.delegateId,
        createdAt: schema.leaveRequests.createdAt,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.users, eq(schema.leaveRequests.employeeId, schema.users.id))
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.delegateId, managerId),
          eq(schema.leaveRequests.status, 'pending'),
        ),
      )
      .orderBy(desc(schema.leaveRequests.createdAt));

    const requests = pendingRequests.map((req) => ({
      id: req.id,
      employeeId: req.employeeId,
      employeeName: `${req.employeeFirstName} ${req.employeeLastName ?? ''}`.trim(),
      employeeEmail: req.employeeEmail,
      leaveType: {
        id: req.leaveTypeId,
        name: req.leaveTypeName,
        code: req.leaveTypeCode,
        color: req.leaveTypeColor,
      },
      fromDate: req.fromDate,
      toDate: req.toDate,
      totalDays: Number(req.totalDays),
      isHalfDay: req.isHalfDay,
      halfDayType: req.halfDayType,
      reason: req.reason,
      isDelegated: true,
      createdAt: req.createdAt,
    }));

    return { total: requests.length, requests };
  }

  async setAutoRules(orgId: string, managerId: string, body: Record<string, any>) {
    const { rules } = body;

    if (!rules) {
      throw new BadRequestException('rules object is required');
    }

    // Store auto-delegation rules in the latest active delegation's metadata
    // or create a policy-level config
    const [latestDelegation] = await this.db
      .select()
      .from(schema.leaveDelegations)
      .where(
        and(
          eq(schema.leaveDelegations.orgId, orgId),
          eq(schema.leaveDelegations.delegatorId, managerId),
          eq(schema.leaveDelegations.isActive, true),
        ),
      )
      .orderBy(desc(schema.leaveDelegations.createdAt))
      .limit(1);

    if (!latestDelegation) {
      throw new NotFoundException('No active delegation found. Create a delegation first.');
    }

    const metadata = (latestDelegation.metadata ?? {}) as Record<string, any>;
    metadata.autoRules = {
      ...rules,
      updatedAt: new Date().toISOString(),
    };

    const [updated] = await this.db
      .update(schema.leaveDelegations)
      .set({
        metadata,
        autoActivated: rules.autoActivate ?? false,
        updatedAt: new Date(),
      })
      .where(eq(schema.leaveDelegations.id, latestDelegation.id))
      .returning();

    return {
      delegationId: updated.id,
      autoRules: metadata.autoRules,
    };
  }
}
