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
export class HandoverMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Get My Handover Overview ────────────────────────────────────────
  async getOverview(orgId: string, employeeId: string) {
    const transfers = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .orderBy(desc(schema.knowledgeTransfers.createdAt));

    const total = transfers.length;
    const completed = transfers.filter((t) => t.status === 'completed').length;
    const pending = transfers.filter((t) => t.status === 'pending').length;
    const inProgress = transfers.filter((t) => t.status === 'in_progress').length;

    return {
      total,
      completed,
      pending,
      inProgress,
      transfers: transfers.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate,
        completedAt: t.completedAt?.toISOString() || null,
      })),
    };
  }

  // ── Create Handover Document ────────────────────────────────────────
  async createHandover(orgId: string, employeeId: string, data: Record<string, any>) {
    const [transfer] = await this.db
      .insert(schema.knowledgeTransfers)
      .values({
        orgId,
        employeeId,
        offboardingId: data.offboardingId || null,
        assignedTo: data.assignedTo || null,
        title: data.title || 'Handover Document',
        description: data.description || null,
        items: data.items || [],
        documentLinks: data.documentLinks || [],
        handoverDocument: data.handoverDocument || {},
        pendingItems: data.pendingItems || [],
        accessCredentials: data.accessCredentials || [],
        status: 'pending',
        dueDate: data.dueDate || null,
      })
      .returning();

    return {
      id: transfer.id,
      title: transfer.title,
      status: transfer.status,
      dueDate: transfer.dueDate,
      createdAt: transfer.createdAt.toISOString(),
    };
  }

  // ── Get Handover Details ────────────────────────────────────────────
  async getHandoverDetail(orgId: string, employeeId: string, handoverId: string) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    let assigneeName: string | null = null;
    if (transfer.assignedTo) {
      const [assignee] = await this.db
        .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(eq(schema.users.id, transfer.assignedTo))
        .limit(1);
      if (assignee) {
        assigneeName = [assignee.firstName, assignee.lastName].filter(Boolean).join(' ');
      }
    }

    return {
      id: transfer.id,
      title: transfer.title,
      description: transfer.description,
      assignedTo: transfer.assignedTo,
      assigneeName,
      status: transfer.status,
      dueDate: transfer.dueDate,
      items: transfer.items,
      documentLinks: transfer.documentLinks,
      handoverDocument: transfer.handoverDocument,
      pendingItems: transfer.pendingItems,
      accessCredentials: transfer.accessCredentials,
      completedAt: transfer.completedAt?.toISOString() || null,
      approvedBy: transfer.approvedBy,
      approvedAt: transfer.approvedAt?.toISOString() || null,
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString(),
    };
  }

  // ── Update Handover Document ────────────────────────────────────────
  async updateHandover(orgId: string, employeeId: string, handoverId: string, data: Record<string, any>) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    if (transfer.status === 'completed' || transfer.status === 'approved') {
      throw new BadRequestException('Cannot update a completed or approved handover');
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate;
    if (data.items !== undefined) updates.items = data.items;
    if (data.documentLinks !== undefined) updates.documentLinks = data.documentLinks;
    if (data.handoverDocument !== undefined) updates.handoverDocument = data.handoverDocument;

    const [updated] = await this.db
      .update(schema.knowledgeTransfers)
      .set(updates)
      .where(eq(schema.knowledgeTransfers.id, handoverId))
      .returning();

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ── List Ongoing Tasks ──────────────────────────────────────────────
  async addTasks(orgId: string, employeeId: string, handoverId: string, data: Record<string, any>) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    const currentItems = (transfer.items as Array<Record<string, any>>) || [];
    const newTasks = (data.tasks as Array<Record<string, any>>) || [];
    for (const task of newTasks) {
      currentItems.push({
        title: task.title,
        description: task.description || null,
        priority: task.priority || 'medium',
        status: task.status || 'ongoing',
        addedAt: new Date().toISOString(),
      });
    }

    await this.db
      .update(schema.knowledgeTransfers)
      .set({ items: currentItems, updatedAt: new Date() })
      .where(eq(schema.knowledgeTransfers.id, handoverId));

    return { handoverId, totalItems: currentItems.length, added: newTasks.length };
  }

  // ── Assign Task Successors ──────────────────────────────────────────
  async assignSuccessors(orgId: string, employeeId: string, handoverId: string, data: Record<string, any>) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    const meta = (transfer.metadata as Record<string, any>) || {};
    meta.successors = data.successors || [];
    meta.successorsUpdatedAt = new Date().toISOString();

    if (data.primarySuccessor) {
      await this.db
        .update(schema.knowledgeTransfers)
        .set({
          assignedTo: data.primarySuccessor,
          metadata: meta,
          updatedAt: new Date(),
        })
        .where(eq(schema.knowledgeTransfers.id, handoverId));
    } else {
      await this.db
        .update(schema.knowledgeTransfers)
        .set({ metadata: meta, updatedAt: new Date() })
        .where(eq(schema.knowledgeTransfers.id, handoverId));
    }

    return { handoverId, successors: meta.successors };
  }

  // ── Share Access Credentials ────────────────────────────────────────
  async shareCredentials(orgId: string, employeeId: string, handoverId: string, data: Record<string, any>) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    const currentCreds = (transfer.accessCredentials as Array<Record<string, any>>) || [];
    const newCreds = (data.credentials as Array<Record<string, any>>) || [];
    for (const cred of newCreds) {
      currentCreds.push({
        system: cred.system,
        description: cred.description || null,
        accessType: cred.accessType || 'login',
        notes: cred.notes || null,
        addedAt: new Date().toISOString(),
      });
    }

    await this.db
      .update(schema.knowledgeTransfers)
      .set({ accessCredentials: currentCreds, updatedAt: new Date() })
      .where(eq(schema.knowledgeTransfers.id, handoverId));

    return { handoverId, totalCredentials: currentCreds.length, added: newCreds.length };
  }

  // ── Document Pending Items ──────────────────────────────────────────
  async addPendingItems(orgId: string, employeeId: string, handoverId: string, data: Record<string, any>) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    const currentPending = (transfer.pendingItems as Array<Record<string, any>>) || [];
    const newItems = (data.items as Array<Record<string, any>>) || [];
    for (const item of newItems) {
      currentPending.push({
        title: item.title,
        description: item.description || null,
        priority: item.priority || 'medium',
        deadline: item.deadline || null,
        addedAt: new Date().toISOString(),
      });
    }

    await this.db
      .update(schema.knowledgeTransfers)
      .set({ pendingItems: currentPending, updatedAt: new Date() })
      .where(eq(schema.knowledgeTransfers.id, handoverId));

    return { handoverId, totalPendingItems: currentPending.length, added: newItems.length };
  }

  // ── Submit Handover for Approval ────────────────────────────────────
  async submitHandover(orgId: string, employeeId: string, handoverId: string) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    if (transfer.status === 'submitted' || transfer.status === 'approved') {
      throw new BadRequestException('Handover has already been submitted');
    }

    const [updated] = await this.db
      .update(schema.knowledgeTransfers)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(eq(schema.knowledgeTransfers.id, handoverId))
      .returning();

    return {
      id: updated.id,
      status: updated.status,
      message: 'Handover submitted for manager approval',
    };
  }

  // ── Check Handover Completion Status ────────────────────────────────
  async getHandoverStatus(orgId: string, employeeId: string, handoverId: string) {
    const [transfer] = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.id, handoverId),
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Handover document not found');
    }

    const items = (transfer.items as Array<Record<string, any>>) || [];
    const pending = (transfer.pendingItems as Array<Record<string, any>>) || [];
    const creds = (transfer.accessCredentials as Array<Record<string, any>>) || [];

    return {
      id: transfer.id,
      status: transfer.status,
      dueDate: transfer.dueDate,
      itemsCount: items.length,
      pendingItemsCount: pending.length,
      credentialsShared: creds.length,
      hasDocument: Object.keys((transfer.handoverDocument as Record<string, any>) || {}).length > 0,
      approvedBy: transfer.approvedBy,
      approvedAt: transfer.approvedAt?.toISOString() || null,
      completedAt: transfer.completedAt?.toISOString() || null,
    };
  }
}
