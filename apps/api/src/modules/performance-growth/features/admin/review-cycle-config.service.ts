import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ReviewCycleConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listCycles(orgId: string, filters: { status?: string; page?: number; limit?: number }) {
    const conditions: any[] = [eq(schema.reviewCycles.orgId, orgId), eq(schema.reviewCycles.isActive, true)];
    if (filters.status) conditions.push(eq(schema.reviewCycles.status, filters.status));

    const rows = await this.db.select().from(schema.reviewCycles).where(and(...conditions)).orderBy(desc(schema.reviewCycles.createdAt));
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    return { data: rows.slice(offset, offset + limit), meta: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) } };
  }

  async createCycle(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.reviewCycles).values({
      orgId, name: data.name, description: data.description ?? null, type: data.type ?? 'annual',
      reviewTypes: data.reviewTypes ?? ['self', 'manager'], ratingScaleType: data.ratingScaleType ?? '1-5',
      ratingScaleConfig: data.ratingScaleConfig ?? {}, componentWeightage: data.componentWeightage ?? {},
      startDate: data.startDate ?? null, endDate: data.endDate ?? null, status: data.status ?? 'draft',
      autoNotifications: data.autoNotifications ?? true, notificationConfig: data.notificationConfig ?? {},
      createdBy, metadata: data.metadata ?? {},
    }).returning();
    return created;
  }

  async getCycle(orgId: string, id: string) {
    const [row] = await this.db.select().from(schema.reviewCycles)
      .where(and(eq(schema.reviewCycles.id, id), eq(schema.reviewCycles.orgId, orgId))).limit(1);
    if (!row) throw new NotFoundException('Review cycle not found');
    return row;
  }

  async updateCycle(orgId: string, id: string, data: Record<string, any>) {
    const existing = await this.getCycle(orgId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = ['name', 'description', 'type', 'reviewTypes', 'ratingScaleType', 'ratingScaleConfig',
      'componentWeightage', 'startDate', 'endDate', 'status', 'autoNotifications', 'notificationConfig', 'metadata'];
    for (const f of fields) { if (data[f] !== undefined) updates[f] = data[f]; }
    await this.db.update(schema.reviewCycles).set(updates).where(and(eq(schema.reviewCycles.id, id), eq(schema.reviewCycles.orgId, orgId)));
    return this.getCycle(orgId, id);
  }

  async deleteCycle(orgId: string, id: string) {
    await this.getCycle(orgId, id);
    await this.db.update(schema.reviewCycles).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.reviewCycles.id, id), eq(schema.reviewCycles.orgId, orgId)));
    return { success: true, message: 'Review cycle deleted' };
  }

  async getCycleAssignments(orgId: string, cycleId: string) {
    const rows = await this.db.select({ assignment: schema.reviewAssignments, employee: schema.users })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.cycleId, cycleId), eq(schema.reviewAssignments.isActive, true)))
      .orderBy(desc(schema.reviewAssignments.createdAt));
    return { data: rows.map(r => ({ ...r.assignment, employeeName: `${r.employee.firstName} ${r.employee.lastName}` })), meta: { total: rows.length } };
  }

  async launchCycle(orgId: string, id: string) {
    const cycle = await this.getCycle(orgId, id);
    const employees = await this.db.select({ id: schema.users.id }).from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)));
    const assignments = employees.map(emp => ({
      orgId, cycleId: id, employeeId: emp.id, reviewerId: null as any, reviewerType: 'self' as const, status: 'pending' as const,
    }));
    if (assignments.length > 0) await this.db.insert(schema.reviewAssignments).values(assignments);
    await this.db.update(schema.reviewCycles).set({ status: 'active', updatedAt: new Date() })
      .where(and(eq(schema.reviewCycles.id, id), eq(schema.reviewCycles.orgId, orgId)));
    return { success: true, message: `Cycle launched with ${assignments.length} assignments`, assignmentCount: assignments.length };
  }
}
