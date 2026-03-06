import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TrainingCalendarService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listSessions(orgId: string, filters: { status?: string; type?: string; startDate?: string; endDate?: string }) {
    const conditions: any[] = [
      eq(schema.trainingSessions.orgId, orgId),
      eq(schema.trainingSessions.isActive, true),
    ];
    if (filters.status) conditions.push(eq(schema.trainingSessions.status, filters.status));
    if (filters.type) conditions.push(eq(schema.trainingSessions.type, filters.type));
    if (filters.startDate) conditions.push(gte(schema.trainingSessions.startTime, new Date(filters.startDate)));
    if (filters.endDate) conditions.push(lte(schema.trainingSessions.endTime, new Date(filters.endDate)));

    const rows = await this.db
      .select()
      .from(schema.trainingSessions)
      .where(and(...conditions))
      .orderBy(desc(schema.trainingSessions.startTime));

    return { data: rows, meta: { total: rows.length } };
  }

  async createSession(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db
      .insert(schema.trainingSessions)
      .values({
        orgId,
        courseId: data.courseId ?? null,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'ilt',
        instructorId: data.instructorId ?? null,
        instructorName: data.instructorName ?? null,
        location: data.location ?? null,
        roomName: data.roomName ?? null,
        virtualLink: data.virtualLink ?? null,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        maxCapacity: data.maxCapacity ?? 30,
        autoEnrollWaitlist: data.autoEnrollWaitlist ?? true,
        attendees: data.attendees ?? [],
        waitlist: data.waitlist ?? [],
        status: data.status ?? 'scheduled',
        createdBy,
        metadata: data.metadata ?? {},
      })
      .returning();

    return created;
  }

  async getSession(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.trainingSessions)
      .where(
        and(
          eq(schema.trainingSessions.id, id),
          eq(schema.trainingSessions.orgId, orgId),
          eq(schema.trainingSessions.isActive, true),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Training session not found');
    return row;
  }

  async updateSession(orgId: string, id: string, data: Record<string, any>) {
    await this.getSession(orgId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = [
      'courseId', 'title', 'description', 'type', 'instructorId', 'instructorName',
      'location', 'roomName', 'virtualLink', 'maxCapacity', 'autoEnrollWaitlist',
      'attendees', 'waitlist', 'status', 'metadata',
    ];
    for (const f of fields) {
      if (data[f] !== undefined) updates[f] = data[f];
    }
    if (data.startTime) updates.startTime = new Date(data.startTime);
    if (data.endTime) updates.endTime = new Date(data.endTime);

    await this.db
      .update(schema.trainingSessions)
      .set(updates)
      .where(and(eq(schema.trainingSessions.id, id), eq(schema.trainingSessions.orgId, orgId)));

    return this.getSession(orgId, id);
  }

  async deleteSession(orgId: string, id: string) {
    await this.getSession(orgId, id);
    await this.db
      .update(schema.trainingSessions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.trainingSessions.id, id), eq(schema.trainingSessions.orgId, orgId)));

    return { success: true, message: 'Training session deleted' };
  }

  async recordAttendance(orgId: string, id: string, data: Record<string, any>) {
    const session = await this.getSession(orgId, id);
    const existingRecords = (session.attendanceRecords as Record<string, any>) ?? {};
    const updatedRecords = { ...existingRecords };

    // data.records is an array of { employeeId, status, notes }
    const records = data.records ?? [];
    for (const record of records) {
      updatedRecords[record.employeeId] = {
        status: record.status ?? 'present',
        notes: record.notes ?? null,
        recordedAt: new Date().toISOString(),
      };
    }

    await this.db
      .update(schema.trainingSessions)
      .set({ attendanceRecords: updatedRecords, updatedAt: new Date() })
      .where(and(eq(schema.trainingSessions.id, id), eq(schema.trainingSessions.orgId, orgId)));

    return {
      success: true,
      message: 'Attendance recorded',
      totalRecorded: Object.keys(updatedRecords).length,
    };
  }
}
