import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class KnowledgeTransferService {
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

  async listTransferPlans(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.knowledgeTransfers.id,
        employeeId: schema.knowledgeTransfers.employeeId,
        offboardingId: schema.knowledgeTransfers.offboardingId,
        assignedTo: schema.knowledgeTransfers.assignedTo,
        title: schema.knowledgeTransfers.title,
        description: schema.knowledgeTransfers.description,
        items: schema.knowledgeTransfers.items,
        status: schema.knowledgeTransfers.status,
        dueDate: schema.knowledgeTransfers.dueDate,
        completedAt: schema.knowledgeTransfers.completedAt,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.knowledgeTransfers.createdAt,
      })
      .from(schema.knowledgeTransfers)
      .innerJoin(schema.users, eq(schema.knowledgeTransfers.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.knowledgeTransfers.orgId, orgId),
          inArray(schema.knowledgeTransfers.employeeId, teamIds),
          eq(schema.knowledgeTransfers.isActive, true),
        ),
      )
      .orderBy(desc(schema.knowledgeTransfers.createdAt));

    // Fetch assignee names
    const assigneeIds = rows.map((r) => r.assignedTo).filter(Boolean) as string[];
    let assigneeMap = new Map<string, string>();
    if (assigneeIds.length > 0) {
      const assignees = await this.db
        .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(inArray(schema.users.id, assigneeIds));
      for (const a of assignees) {
        assigneeMap.set(a.id, `${a.firstName} ${a.lastName ?? ''}`.trim());
      }
    }

    return {
      data: rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        offboardingId: r.offboardingId,
        assignedTo: r.assignedTo,
        assigneeName: r.assignedTo ? (assigneeMap.get(r.assignedTo) ?? 'Unknown') : null,
        title: r.title,
        description: r.description,
        itemCount: Array.isArray(r.items) ? (r.items as any[]).length : 0,
        status: r.status,
        dueDate: r.dueDate,
        completedAt: r.completedAt?.toISOString?.() ?? null,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      total: rows.length,
    };
  }

  async createTransferPlan(orgId: string, managerId: string, body: Record<string, any>) {
    if (!body.employeeId) throw new BadRequestException('employeeId is required');
    if (!body.title) throw new BadRequestException('title is required');

    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(body.employeeId)) {
      throw new NotFoundException('Employee not found in your team');
    }

    const [plan] = await this.db
      .insert(schema.knowledgeTransfers)
      .values({
        orgId,
        employeeId: body.employeeId,
        offboardingId: body.offboardingId ?? null,
        assignedTo: body.assignedTo ?? null,
        title: body.title,
        description: body.description ?? null,
        items: body.items ?? [],
        documentLinks: body.documentLinks ?? [],
        dueDate: body.dueDate ?? null,
        status: 'pending',
      })
      .returning();

    return { message: 'Knowledge transfer plan created', data: plan };
  }

  async getTransferDetail(orgId: string, managerId: string, transferId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [row] = await this.db
      .select({
        id: schema.knowledgeTransfers.id,
        employeeId: schema.knowledgeTransfers.employeeId,
        offboardingId: schema.knowledgeTransfers.offboardingId,
        assignedTo: schema.knowledgeTransfers.assignedTo,
        title: schema.knowledgeTransfers.title,
        description: schema.knowledgeTransfers.description,
        items: schema.knowledgeTransfers.items,
        documentLinks: schema.knowledgeTransfers.documentLinks,
        handoverDocument: schema.knowledgeTransfers.handoverDocument,
        pendingItems: schema.knowledgeTransfers.pendingItems,
        accessCredentials: schema.knowledgeTransfers.accessCredentials,
        status: schema.knowledgeTransfers.status,
        dueDate: schema.knowledgeTransfers.dueDate,
        completedAt: schema.knowledgeTransfers.completedAt,
        approvedBy: schema.knowledgeTransfers.approvedBy,
        approvedAt: schema.knowledgeTransfers.approvedAt,
        metadata: schema.knowledgeTransfers.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.knowledgeTransfers.createdAt,
        updatedAt: schema.knowledgeTransfers.updatedAt,
      })
      .from(schema.knowledgeTransfers)
      .innerJoin(schema.users, eq(schema.knowledgeTransfers.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.knowledgeTransfers.id, transferId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.isActive, true),
        ),
      );

    if (!row || !teamIds.includes(row.employeeId)) {
      throw new NotFoundException('Knowledge transfer plan not found');
    }

    return {
      ...row,
      employeeName: `${row.firstName} ${row.lastName ?? ''}`.trim(),
      completedAt: row.completedAt?.toISOString?.() ?? null,
      approvedAt: row.approvedAt?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  async updateTransferPlan(orgId: string, managerId: string, transferId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [existing] = await this.db
      .select({ id: schema.knowledgeTransfers.id, employeeId: schema.knowledgeTransfers.employeeId })
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, transferId),
          eq(schema.knowledgeTransfers.orgId, orgId),
        ),
      );

    if (!existing || !teamIds.includes(existing.employeeId)) {
      throw new NotFoundException('Knowledge transfer plan not found');
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.status !== undefined) updates.status = body.status;
    if (body.documentLinks !== undefined) updates.documentLinks = body.documentLinks;

    await this.db
      .update(schema.knowledgeTransfers)
      .set(updates)
      .where(eq(schema.knowledgeTransfers.id, transferId));

    return { message: 'Knowledge transfer plan updated', transferId };
  }

  async addTransferItem(orgId: string, managerId: string, transferId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [transfer] = await this.db
      .select({
        id: schema.knowledgeTransfers.id,
        employeeId: schema.knowledgeTransfers.employeeId,
        items: schema.knowledgeTransfers.items,
      })
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, transferId),
          eq(schema.knowledgeTransfers.orgId, orgId),
        ),
      );

    if (!transfer || !teamIds.includes(transfer.employeeId)) {
      throw new NotFoundException('Knowledge transfer plan not found');
    }

    if (!body.title) throw new BadRequestException('Item title is required');

    const existing = Array.isArray(transfer.items) ? (transfer.items as any[]) : [];
    const newItem = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? 'general',
      status: 'pending',
      assignedTo: body.assignedTo ?? null,
      dueDate: body.dueDate ?? null,
      createdAt: new Date().toISOString(),
    };

    const updated = [...existing, newItem];

    await this.db
      .update(schema.knowledgeTransfers)
      .set({ items: updated, updatedAt: new Date() })
      .where(eq(schema.knowledgeTransfers.id, transferId));

    return { message: 'Transfer item added', transferId, item: newItem };
  }

  async updateTransferItem(orgId: string, managerId: string, transferId: string, itemId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [transfer] = await this.db
      .select({
        id: schema.knowledgeTransfers.id,
        employeeId: schema.knowledgeTransfers.employeeId,
        items: schema.knowledgeTransfers.items,
      })
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, transferId),
          eq(schema.knowledgeTransfers.orgId, orgId),
        ),
      );

    if (!transfer || !teamIds.includes(transfer.employeeId)) {
      throw new NotFoundException('Knowledge transfer plan not found');
    }

    const items = Array.isArray(transfer.items) ? (transfer.items as any[]) : [];
    const itemIndex = items.findIndex((i: any) => i.id === itemId);

    if (itemIndex === -1) throw new NotFoundException('Transfer item not found');

    if (body.status !== undefined) items[itemIndex].status = body.status;
    if (body.title !== undefined) items[itemIndex].title = body.title;
    if (body.description !== undefined) items[itemIndex].description = body.description;
    if (body.assignedTo !== undefined) items[itemIndex].assignedTo = body.assignedTo;
    if (body.status === 'completed') items[itemIndex].completedAt = new Date().toISOString();
    items[itemIndex].updatedAt = new Date().toISOString();

    await this.db
      .update(schema.knowledgeTransfers)
      .set({ items, updatedAt: new Date() })
      .where(eq(schema.knowledgeTransfers.id, transferId));

    return { message: 'Transfer item updated', transferId, item: items[itemIndex] };
  }

  async getCompletionStatus(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], summary: { total: 0, completed: 0, inProgress: 0, pending: 0 } };

    const transfers = await this.db
      .select({
        id: schema.knowledgeTransfers.id,
        employeeId: schema.knowledgeTransfers.employeeId,
        title: schema.knowledgeTransfers.title,
        items: schema.knowledgeTransfers.items,
        status: schema.knowledgeTransfers.status,
        dueDate: schema.knowledgeTransfers.dueDate,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.knowledgeTransfers)
      .innerJoin(schema.users, eq(schema.knowledgeTransfers.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.knowledgeTransfers.orgId, orgId),
          inArray(schema.knowledgeTransfers.employeeId, teamIds),
          eq(schema.knowledgeTransfers.isActive, true),
        ),
      )
      .orderBy(schema.knowledgeTransfers.dueDate);

    let totalPlans = 0;
    let completedPlans = 0;
    let inProgressPlans = 0;
    let pendingPlans = 0;

    const data = transfers.map((t) => {
      totalPlans++;
      if (t.status === 'completed') completedPlans++;
      else if (t.status === 'in_progress') inProgressPlans++;
      else pendingPlans++;

      const items = Array.isArray(t.items) ? (t.items as any[]) : [];
      const completedItems = items.filter((i: any) => i.status === 'completed').length;

      return {
        transferId: t.id,
        employeeId: t.employeeId,
        employeeName: `${t.firstName} ${t.lastName ?? ''}`.trim(),
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
        totalItems: items.length,
        completedItems,
        itemCompletionRate: items.length > 0 ? Math.round((completedItems / items.length) * 10000) / 100 : 0,
      };
    });

    return {
      data,
      summary: { total: totalPlans, completed: completedPlans, inProgress: inProgressPlans, pending: pendingPlans },
    };
  }
}
