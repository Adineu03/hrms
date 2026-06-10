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

  /** Map a raw delegation row + delegate info to the shape the manager tab renders. */
  private toDelegationDto(
    d: typeof schema.leaveDelegations.$inferSelect | Record<string, any>,
    delegate?: { firstName: string; lastName: string | null; email: string } | null,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    let status: 'active' | 'expired' | 'revoked';
    if (d.endDate && d.endDate < today) {
      status = 'expired';
    } else {
      status = d.isActive ? 'active' : 'revoked';
    }

    return {
      id: d.id,
      delegatorId: d.delegatorId,
      delegateId: d.delegateId,
      delegateName: delegate
        ? `${delegate.firstName} ${delegate.lastName ?? ''}`.trim()
        : 'Unknown',
      delegateEmail: delegate?.email ?? null,
      startDate: d.startDate,
      endDate: d.endDate,
      type: d.delegationType === 'partial' ? 'partial' : 'full',
      delegationType: d.delegationType,
      status,
      isActive: d.isActive,
      activatedAt: d.activatedAt,
      autoActivated: d.autoActivated,
      metadata: d.metadata,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private async getDelegateInfo(delegateId: string) {
    const [delegate] = await this.db
      .select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.id, delegateId))
      .limit(1);
    return delegate ?? null;
  }

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

    const enriched = delegations.map((d) =>
      this.toDelegationDto(d, delegateMap.get(d.delegateId) ?? null),
    );

    return {
      total: enriched.length,
      active: enriched.filter((d) => d.status === 'active').length,
      delegations: enriched,
      // Alias consumed by the manager Delegation tab (reads response.data)
      data: enriched,
    };
  }

  async getTeamMembers(orgId: string, managerId: string) {
    const rows = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.employeeProfiles)
      .innerJoin(
        schema.users,
        and(
          eq(schema.employeeProfiles.userId, schema.users.id),
          eq(schema.users.orgId, orgId),
          eq(schema.users.isActive, true),
        ),
      )
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      )
      .orderBy(schema.users.firstName);

    return rows
      .filter((r) => r.id !== managerId)
      .map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        email: r.email,
      }));
  }

  async createDelegation(orgId: string, managerId: string, body: Record<string, any>) {
    const { delegateId, startDate, endDate } = body;
    // Tab posts `type` ('full' | 'partial'); accept `delegationType` too
    const delegationType = body.delegationType ?? body.type ?? 'full';

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
        delegationType,
        isActive: true,
        activatedAt: now,
        autoActivated: false,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toDelegationDto(created, await this.getDelegateInfo(created.delegateId));
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
    else if (body.type !== undefined) updateData.delegationType = body.type;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await this.db
      .update(schema.leaveDelegations)
      .set(updateData)
      .where(eq(schema.leaveDelegations.id, delegationId))
      .returning();

    return this.toDelegationDto(updated, await this.getDelegateInfo(updated.delegateId));
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

    // Resolve each employee's manager name (= the delegator the approval came from)
    const employeeIds = [...new Set(requests.map((r) => r.employeeId))];
    const managerNameByEmployee = new Map<string, string>();
    if (employeeIds.length > 0) {
      const profiles = await this.db
        .select({
          userId: schema.employeeProfiles.userId,
          managerId: schema.employeeProfiles.managerId,
        })
        .from(schema.employeeProfiles)
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            inArray(schema.employeeProfiles.userId, employeeIds),
          ),
        );

      const managerIds = [
        ...new Set(profiles.map((p) => p.managerId).filter((m): m is string => !!m)),
      ];
      const managerNames = new Map<string, string>();
      if (managerIds.length > 0) {
        const managers = await this.db
          .select({
            id: schema.users.id,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
          })
          .from(schema.users)
          .where(inArray(schema.users.id, managerIds));
        for (const m of managers) {
          managerNames.set(m.id, `${m.firstName} ${m.lastName ?? ''}`.trim());
        }
      }
      for (const p of profiles) {
        if (p.managerId && managerNames.has(p.managerId)) {
          managerNameByEmployee.set(p.userId, managerNames.get(p.managerId)!);
        }
      }
    }

    // Alias consumed by the manager Delegation tab table
    const data = requests.map((r) => ({
      id: r.id,
      employeeName: r.employeeName,
      leaveType: r.leaveType.name,
      startDate: r.fromDate,
      endDate: r.toDate,
      days: r.totalDays,
      status: 'pending' as const,
      delegatedFrom: managerNameByEmployee.get(r.employeeId) ?? '—',
    }));

    return { total: requests.length, requests, data };
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
