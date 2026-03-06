import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OneOnOneMeetingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listMeetings(orgId: string, managerId: string, filters?: { status?: string; employeeId?: string }) {
    const conditions = [
      eq(schema.oneOnOneMeetings.orgId, orgId),
      eq(schema.oneOnOneMeetings.managerId, managerId),
      eq(schema.oneOnOneMeetings.isActive, true),
    ];
    if (filters?.status) conditions.push(eq(schema.oneOnOneMeetings.status, filters.status));
    if (filters?.employeeId) conditions.push(eq(schema.oneOnOneMeetings.employeeId, filters.employeeId));

    const rows = await this.db
      .select({
        id: schema.oneOnOneMeetings.id,
        employeeId: schema.oneOnOneMeetings.employeeId,
        scheduledAt: schema.oneOnOneMeetings.scheduledAt,
        duration: schema.oneOnOneMeetings.duration,
        status: schema.oneOnOneMeetings.status,
        isRecurring: schema.oneOnOneMeetings.isRecurring,
        recurrencePattern: schema.oneOnOneMeetings.recurrencePattern,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.oneOnOneMeetings.createdAt,
      })
      .from(schema.oneOnOneMeetings)
      .innerJoin(schema.users, eq(schema.oneOnOneMeetings.employeeId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.oneOnOneMeetings.scheduledAt));

    return {
      data: rows.map((r) => ({
        ...r,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        scheduledAt: r.scheduledAt?.toISOString?.() ?? null,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      meta: { total: rows.length },
    };
  }

  async scheduleMeeting(orgId: string, managerId: string, body: {
    employeeId: string;
    scheduledAt: string;
    duration?: number;
    agenda?: any[];
    isRecurring?: boolean;
    recurrencePattern?: string;
  }) {
    const [meeting] = await this.db
      .insert(schema.oneOnOneMeetings)
      .values({
        orgId,
        managerId,
        employeeId: body.employeeId,
        scheduledAt: new Date(body.scheduledAt),
        duration: body.duration ?? 30,
        agenda: body.agenda ?? [],
        isRecurring: body.isRecurring ?? false,
        recurrencePattern: body.recurrencePattern,
        status: 'scheduled',
      })
      .returning();

    return { message: 'Meeting scheduled successfully', meeting };
  }

  async getMeeting(orgId: string, id: string) {
    const [meeting] = await this.db
      .select({
        id: schema.oneOnOneMeetings.id,
        managerId: schema.oneOnOneMeetings.managerId,
        employeeId: schema.oneOnOneMeetings.employeeId,
        scheduledAt: schema.oneOnOneMeetings.scheduledAt,
        duration: schema.oneOnOneMeetings.duration,
        agenda: schema.oneOnOneMeetings.agenda,
        notes: schema.oneOnOneMeetings.notes,
        actionItems: schema.oneOnOneMeetings.actionItems,
        status: schema.oneOnOneMeetings.status,
        completedAt: schema.oneOnOneMeetings.completedAt,
        isRecurring: schema.oneOnOneMeetings.isRecurring,
        recurrencePattern: schema.oneOnOneMeetings.recurrencePattern,
        metadata: schema.oneOnOneMeetings.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.oneOnOneMeetings.createdAt,
        updatedAt: schema.oneOnOneMeetings.updatedAt,
      })
      .from(schema.oneOnOneMeetings)
      .innerJoin(schema.users, eq(schema.oneOnOneMeetings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.oneOnOneMeetings.id, id),
          eq(schema.oneOnOneMeetings.orgId, orgId),
          eq(schema.oneOnOneMeetings.isActive, true),
        ),
      );

    if (!meeting) throw new NotFoundException('Meeting not found');

    return {
      ...meeting,
      employeeName: `${meeting.firstName} ${meeting.lastName ?? ''}`.trim(),
      scheduledAt: meeting.scheduledAt?.toISOString?.() ?? null,
      completedAt: meeting.completedAt?.toISOString?.() ?? null,
      createdAt: meeting.createdAt?.toISOString?.() ?? meeting.createdAt,
      updatedAt: meeting.updatedAt?.toISOString?.() ?? meeting.updatedAt,
    };
  }

  async updateMeeting(orgId: string, id: string, body: {
    scheduledAt?: string;
    duration?: number;
    agenda?: any[];
    notes?: string;
    actionItems?: any[];
  }) {
    const [existing] = await this.db
      .select({ id: schema.oneOnOneMeetings.id })
      .from(schema.oneOnOneMeetings)
      .where(
        and(
          eq(schema.oneOnOneMeetings.id, id),
          eq(schema.oneOnOneMeetings.orgId, orgId),
          eq(schema.oneOnOneMeetings.isActive, true),
        ),
      );

    if (!existing) throw new NotFoundException('Meeting not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt);
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.agenda !== undefined) updateData.agenda = body.agenda;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.actionItems !== undefined) updateData.actionItems = body.actionItems;

    const [updated] = await this.db
      .update(schema.oneOnOneMeetings)
      .set(updateData)
      .where(eq(schema.oneOnOneMeetings.id, id))
      .returning();

    return updated;
  }

  async cancelMeeting(orgId: string, id: string) {
    const [existing] = await this.db
      .select({ id: schema.oneOnOneMeetings.id, status: schema.oneOnOneMeetings.status })
      .from(schema.oneOnOneMeetings)
      .where(
        and(
          eq(schema.oneOnOneMeetings.id, id),
          eq(schema.oneOnOneMeetings.orgId, orgId),
          eq(schema.oneOnOneMeetings.isActive, true),
        ),
      );

    if (!existing) throw new NotFoundException('Meeting not found');
    if (existing.status === 'completed') throw new BadRequestException('Cannot cancel a completed meeting');

    await this.db
      .update(schema.oneOnOneMeetings)
      .set({ isActive: false, status: 'cancelled', updatedAt: new Date() })
      .where(eq(schema.oneOnOneMeetings.id, id));

    return { message: 'Meeting cancelled successfully', id };
  }

  async completeMeeting(orgId: string, id: string, body: { notes?: string; actionItems?: any[] }) {
    const [existing] = await this.db
      .select({ id: schema.oneOnOneMeetings.id, status: schema.oneOnOneMeetings.status })
      .from(schema.oneOnOneMeetings)
      .where(
        and(
          eq(schema.oneOnOneMeetings.id, id),
          eq(schema.oneOnOneMeetings.orgId, orgId),
          eq(schema.oneOnOneMeetings.isActive, true),
        ),
      );

    if (!existing) throw new NotFoundException('Meeting not found');
    if (existing.status === 'completed') throw new BadRequestException('Meeting already completed');

    const updateData: Record<string, any> = {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.actionItems !== undefined) updateData.actionItems = body.actionItems;

    const [updated] = await this.db
      .update(schema.oneOnOneMeetings)
      .set(updateData)
      .where(eq(schema.oneOnOneMeetings.id, id))
      .returning();

    return { message: 'Meeting completed successfully', meeting: updated };
  }

  async getActionItems(orgId: string, id: string) {
    const [meeting] = await this.db
      .select({
        id: schema.oneOnOneMeetings.id,
        actionItems: schema.oneOnOneMeetings.actionItems,
        employeeId: schema.oneOnOneMeetings.employeeId,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.oneOnOneMeetings)
      .innerJoin(schema.users, eq(schema.oneOnOneMeetings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.oneOnOneMeetings.id, id),
          eq(schema.oneOnOneMeetings.orgId, orgId),
          eq(schema.oneOnOneMeetings.isActive, true),
        ),
      );

    if (!meeting) throw new NotFoundException('Meeting not found');

    const items = (meeting.actionItems as any[]) ?? [];
    return {
      meetingId: meeting.id,
      employeeName: `${meeting.firstName} ${meeting.lastName ?? ''}`.trim(),
      actionItems: items.map((item: any, index: number) => ({
        index,
        ...item,
      })),
      total: items.length,
    };
  }

  async updateActionItem(orgId: string, id: string, index: number, body: {
    title?: string;
    status?: string;
    dueDate?: string;
    notes?: string;
  }) {
    const [meeting] = await this.db
      .select({ id: schema.oneOnOneMeetings.id, actionItems: schema.oneOnOneMeetings.actionItems })
      .from(schema.oneOnOneMeetings)
      .where(
        and(
          eq(schema.oneOnOneMeetings.id, id),
          eq(schema.oneOnOneMeetings.orgId, orgId),
          eq(schema.oneOnOneMeetings.isActive, true),
        ),
      );

    if (!meeting) throw new NotFoundException('Meeting not found');

    const items = [...((meeting.actionItems as any[]) ?? [])];
    if (index < 0 || index >= items.length) throw new BadRequestException('Invalid action item index');

    items[index] = { ...items[index], ...body, updatedAt: new Date().toISOString() };

    const [updated] = await this.db
      .update(schema.oneOnOneMeetings)
      .set({ actionItems: items, updatedAt: new Date() })
      .where(eq(schema.oneOnOneMeetings.id, id))
      .returning();

    return { message: 'Action item updated', actionItem: items[index] };
  }
}
