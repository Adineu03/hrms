import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamOffboardingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return members.map((m) => m.userId);
  }

  async listOffboardings(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.employeeOffboardings.id,
        employeeId: schema.employeeOffboardings.employeeId,
        exitType: schema.employeeOffboardings.exitType,
        exitReason: schema.employeeOffboardings.exitReason,
        resignationDate: schema.employeeOffboardings.resignationDate,
        lastWorkingDate: schema.employeeOffboardings.lastWorkingDate,
        noticePeriodDays: schema.employeeOffboardings.noticePeriodDays,
        clearanceStatus: schema.employeeOffboardings.clearanceStatus,
        handoverStatus: schema.employeeOffboardings.handoverStatus,
        settlementStatus: schema.employeeOffboardings.settlementStatus,
        status: schema.employeeOffboardings.status,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.employeeOffboardings.createdAt,
      })
      .from(schema.employeeOffboardings)
      .innerJoin(schema.users, eq(schema.employeeOffboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          inArray(schema.employeeOffboardings.employeeId, teamIds),
          eq(schema.employeeOffboardings.isActive, true),
        ),
      )
      .orderBy(desc(schema.employeeOffboardings.createdAt));

    return {
      data: rows.map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      total: rows.length,
    };
  }

  async getOffboardingDetail(orgId: string, managerId: string, offboardingId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [row] = await this.db
      .select({
        id: schema.employeeOffboardings.id,
        employeeId: schema.employeeOffboardings.employeeId,
        workflowId: schema.employeeOffboardings.workflowId,
        exitType: schema.employeeOffboardings.exitType,
        exitReason: schema.employeeOffboardings.exitReason,
        resignationDate: schema.employeeOffboardings.resignationDate,
        lastWorkingDate: schema.employeeOffboardings.lastWorkingDate,
        noticePeriodDays: schema.employeeOffboardings.noticePeriodDays,
        clearanceStatus: schema.employeeOffboardings.clearanceStatus,
        assetReturnStatus: schema.employeeOffboardings.assetReturnStatus,
        settlementStatus: schema.employeeOffboardings.settlementStatus,
        settlementEstimate: schema.employeeOffboardings.settlementEstimate,
        handoverStatus: schema.employeeOffboardings.handoverStatus,
        exitSurveyResponses: schema.employeeOffboardings.exitSurveyResponses,
        rehireEligible: schema.employeeOffboardings.rehireEligible,
        status: schema.employeeOffboardings.status,
        metadata: schema.employeeOffboardings.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.employeeOffboardings.createdAt,
        updatedAt: schema.employeeOffboardings.updatedAt,
      })
      .from(schema.employeeOffboardings)
      .innerJoin(schema.users, eq(schema.employeeOffboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOffboardings.id, offboardingId),
          eq(schema.employeeOffboardings.orgId, orgId),
          eq(schema.employeeOffboardings.isActive, true),
        ),
      );

    if (!row || !teamIds.includes(row.employeeId)) {
      throw new NotFoundException('Offboarding record not found');
    }

    // Fetch knowledge transfers for this offboarding
    const transfers = await this.db
      .select({
        id: schema.knowledgeTransfers.id,
        title: schema.knowledgeTransfers.title,
        status: schema.knowledgeTransfers.status,
        dueDate: schema.knowledgeTransfers.dueDate,
        assignedTo: schema.knowledgeTransfers.assignedTo,
      })
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.offboardingId, offboardingId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.isActive, true),
        ),
      );

    return {
      ...row,
      employeeName: `${row.firstName} ${row.lastName ?? ''}`.trim(),
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
      knowledgeTransfers: transfers,
    };
  }

  async assignKnowledgeTransfer(orgId: string, managerId: string, offboardingId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [offboarding] = await this.db
      .select({ id: schema.employeeOffboardings.id, employeeId: schema.employeeOffboardings.employeeId })
      .from(schema.employeeOffboardings)
      .where(
        and(
          eq(schema.employeeOffboardings.id, offboardingId),
          eq(schema.employeeOffboardings.orgId, orgId),
        ),
      );

    if (!offboarding || !teamIds.includes(offboarding.employeeId)) {
      throw new NotFoundException('Offboarding record not found');
    }

    if (!body.title) throw new BadRequestException('Title is required');

    const [transfer] = await this.db
      .insert(schema.knowledgeTransfers)
      .values({
        orgId,
        employeeId: offboarding.employeeId,
        offboardingId,
        assignedTo: body.assignedTo ?? null,
        title: body.title,
        description: body.description ?? null,
        items: body.items ?? [],
        dueDate: body.dueDate ?? null,
        status: 'pending',
      })
      .returning();

    return { message: 'Knowledge transfer task assigned', data: transfer };
  }

  async approveClearance(orgId: string, managerId: string, offboardingId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [offboarding] = await this.db
      .select({
        id: schema.employeeOffboardings.id,
        employeeId: schema.employeeOffboardings.employeeId,
        clearanceStatus: schema.employeeOffboardings.clearanceStatus,
      })
      .from(schema.employeeOffboardings)
      .where(
        and(
          eq(schema.employeeOffboardings.id, offboardingId),
          eq(schema.employeeOffboardings.orgId, orgId),
        ),
      );

    if (!offboarding || !teamIds.includes(offboarding.employeeId)) {
      throw new NotFoundException('Offboarding record not found');
    }

    const existingClearance = (offboarding.clearanceStatus as Record<string, any>) ?? {};
    const updatedClearance = {
      ...existingClearance,
      ...body.clearanceItems,
      managerApproval: {
        approved: true,
        approvedBy: managerId,
        approvedAt: new Date().toISOString(),
        notes: body.notes ?? null,
      },
    };

    await this.db
      .update(schema.employeeOffboardings)
      .set({ clearanceStatus: updatedClearance, updatedAt: new Date() })
      .where(eq(schema.employeeOffboardings.id, offboardingId));

    return { message: 'Clearance items updated', clearanceStatus: updatedClearance };
  }

  async getHandoverStatus(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [] };

    const offboardings = await this.db
      .select({
        id: schema.employeeOffboardings.id,
        employeeId: schema.employeeOffboardings.employeeId,
        handoverStatus: schema.employeeOffboardings.handoverStatus,
        lastWorkingDate: schema.employeeOffboardings.lastWorkingDate,
        status: schema.employeeOffboardings.status,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.employeeOffboardings)
      .innerJoin(schema.users, eq(schema.employeeOffboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          inArray(schema.employeeOffboardings.employeeId, teamIds),
          eq(schema.employeeOffboardings.isActive, true),
        ),
      );

    // Fetch knowledge transfer counts per offboarding
    const offboardingIds = offboardings.map((o) => o.id);
    let transferMap = new Map<string, { total: number; completed: number }>();

    if (offboardingIds.length > 0) {
      const transfers = await this.db
        .select({
          offboardingId: schema.knowledgeTransfers.offboardingId,
          status: schema.knowledgeTransfers.status,
        })
        .from(schema.knowledgeTransfers)
        .where(
          and(
            eq(schema.knowledgeTransfers.orgId, orgId),
            inArray(schema.knowledgeTransfers.offboardingId, offboardingIds),
            eq(schema.knowledgeTransfers.isActive, true),
          ),
        );

      for (const t of transfers) {
        if (!t.offboardingId) continue;
        const entry = transferMap.get(t.offboardingId) ?? { total: 0, completed: 0 };
        entry.total += 1;
        if (t.status === 'completed') entry.completed += 1;
        transferMap.set(t.offboardingId, entry);
      }
    }

    return {
      data: offboardings.map((o) => ({
        offboardingId: o.id,
        employeeId: o.employeeId,
        employeeName: `${o.firstName} ${o.lastName ?? ''}`.trim(),
        handoverStatus: o.handoverStatus,
        lastWorkingDate: o.lastWorkingDate,
        exitStatus: o.status,
        knowledgeTransfers: transferMap.get(o.id) ?? { total: 0, completed: 0 },
      })),
    };
  }

  async getPendingApprovals(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const offboardings = await this.db
      .select({
        id: schema.employeeOffboardings.id,
        employeeId: schema.employeeOffboardings.employeeId,
        exitType: schema.employeeOffboardings.exitType,
        resignationDate: schema.employeeOffboardings.resignationDate,
        lastWorkingDate: schema.employeeOffboardings.lastWorkingDate,
        clearanceStatus: schema.employeeOffboardings.clearanceStatus,
        handoverStatus: schema.employeeOffboardings.handoverStatus,
        status: schema.employeeOffboardings.status,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.employeeOffboardings.createdAt,
      })
      .from(schema.employeeOffboardings)
      .innerJoin(schema.users, eq(schema.employeeOffboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          inArray(schema.employeeOffboardings.employeeId, teamIds),
          eq(schema.employeeOffboardings.isActive, true),
          eq(schema.employeeOffboardings.status, 'initiated'),
        ),
      )
      .orderBy(schema.employeeOffboardings.createdAt);

    return {
      data: offboardings.map((o) => ({
        ...o,
        employeeName: `${o.firstName} ${o.lastName ?? ''}`.trim(),
        createdAt: o.createdAt?.toISOString?.() ?? o.createdAt,
      })),
      total: offboardings.length,
    };
  }
}
