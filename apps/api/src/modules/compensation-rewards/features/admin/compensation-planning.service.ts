import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CompensationPlanningService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listRevisions(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(eq(schema.compensationRevisions.orgId, orgId), eq(schema.compensationRevisions.isActive, true)))
      .orderBy(desc(schema.compensationRevisions.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createRevision(orgId: string, userId: string, dto: {
    title: string;
    type?: string;
    fiscalYear: string;
    effectiveDate?: string;
    totalBudget?: string;
    departments?: any[];
    grades?: any[];
  }) {
    const [row] = await this.db
      .insert(schema.compensationRevisions)
      .values({
        orgId,
        title: dto.title,
        type: dto.type ?? 'annual',
        fiscalYear: dto.fiscalYear,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        totalBudget: dto.totalBudget ?? '0',
        departments: dto.departments ?? [],
        grades: dto.grades ?? [],
        createdBy: userId,
      })
      .returning();

    return { data: row };
  }

  async getRevisionDetails(orgId: string, id: string) {
    const revisions = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(eq(schema.compensationRevisions.id, id), eq(schema.compensationRevisions.orgId, orgId), eq(schema.compensationRevisions.isActive, true)));

    if (!revisions.length) throw new NotFoundException('Compensation revision not found');

    const items = await this.db
      .select({
        item: schema.compensationRevisionItems,
        employeeName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.compensationRevisionItems)
      .leftJoin(schema.users, eq(schema.compensationRevisionItems.employeeId, schema.users.id))
      .where(and(eq(schema.compensationRevisionItems.revisionId, id), eq(schema.compensationRevisionItems.orgId, orgId), eq(schema.compensationRevisionItems.isActive, true)))
      .orderBy(desc(schema.compensationRevisionItems.createdAt));

    return { data: { ...revisions[0], items: items.map((i) => ({ ...i.item, employeeName: i.employeeName })) } };
  }

  async updateRevision(orgId: string, id: string, dto: {
    title?: string;
    type?: string;
    status?: string;
    effectiveDate?: string;
    totalBudget?: string;
    departments?: any[];
    grades?: any[];
  }) {
    const existing = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(eq(schema.compensationRevisions.id, id), eq(schema.compensationRevisions.orgId, orgId), eq(schema.compensationRevisions.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compensation revision not found');

    const [row] = await this.db
      .update(schema.compensationRevisions)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.effectiveDate !== undefined && { effectiveDate: new Date(dto.effectiveDate) }),
        ...(dto.totalBudget !== undefined && { totalBudget: dto.totalBudget }),
        ...(dto.departments !== undefined && { departments: dto.departments }),
        ...(dto.grades !== undefined && { grades: dto.grades }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.compensationRevisions.id, id), eq(schema.compensationRevisions.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteRevision(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(eq(schema.compensationRevisions.id, id), eq(schema.compensationRevisions.orgId, orgId), eq(schema.compensationRevisions.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compensation revision not found');

    const [row] = await this.db
      .update(schema.compensationRevisions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.compensationRevisions.id, id), eq(schema.compensationRevisions.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async listRevisionItems(orgId: string, revisionId: string) {
    const items = await this.db
      .select({
        item: schema.compensationRevisionItems,
        employeeName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.compensationRevisionItems)
      .leftJoin(schema.users, eq(schema.compensationRevisionItems.employeeId, schema.users.id))
      .where(and(
        eq(schema.compensationRevisionItems.revisionId, revisionId),
        eq(schema.compensationRevisionItems.orgId, orgId),
        eq(schema.compensationRevisionItems.isActive, true),
      ))
      .orderBy(desc(schema.compensationRevisionItems.createdAt));

    return { data: items.map((i) => ({ ...i.item, employeeName: i.employeeName })), meta: { total: items.length } };
  }

  async addRevisionItem(orgId: string, revisionId: string, dto: {
    employeeId: string;
    currentCtc?: string;
    proposedCtc?: string;
    incrementPercent?: string;
    incrementAmount?: string;
    meritScore?: number;
    remarks?: string;
  }) {
    const [row] = await this.db
      .insert(schema.compensationRevisionItems)
      .values({
        orgId,
        revisionId,
        employeeId: dto.employeeId,
        currentCtc: dto.currentCtc ?? '0',
        proposedCtc: dto.proposedCtc ?? '0',
        incrementPercent: dto.incrementPercent ?? '0',
        incrementAmount: dto.incrementAmount ?? '0',
        meritScore: dto.meritScore ?? null,
        remarks: dto.remarks ?? null,
      })
      .returning();

    return { data: row };
  }

  async updateRevisionItem(orgId: string, revisionId: string, itemId: string, dto: {
    proposedCtc?: string;
    incrementPercent?: string;
    incrementAmount?: string;
    meritScore?: number;
    status?: string;
    approvedBy?: string;
    remarks?: string;
  }) {
    const existing = await this.db
      .select()
      .from(schema.compensationRevisionItems)
      .where(and(
        eq(schema.compensationRevisionItems.id, itemId),
        eq(schema.compensationRevisionItems.revisionId, revisionId),
        eq(schema.compensationRevisionItems.orgId, orgId),
        eq(schema.compensationRevisionItems.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Revision item not found');

    const [row] = await this.db
      .update(schema.compensationRevisionItems)
      .set({
        ...(dto.proposedCtc !== undefined && { proposedCtc: dto.proposedCtc }),
        ...(dto.incrementPercent !== undefined && { incrementPercent: dto.incrementPercent }),
        ...(dto.incrementAmount !== undefined && { incrementAmount: dto.incrementAmount }),
        ...(dto.meritScore !== undefined && { meritScore: dto.meritScore }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.approvedBy !== undefined && { approvedBy: dto.approvedBy }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.compensationRevisionItems.id, itemId),
        eq(schema.compensationRevisionItems.orgId, orgId),
      ))
      .returning();

    return { data: row };
  }

  async getBudgetAllocation(orgId: string) {
    const revisions = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(eq(schema.compensationRevisions.orgId, orgId), eq(schema.compensationRevisions.isActive, true)))
      .orderBy(desc(schema.compensationRevisions.createdAt));

    const overview = revisions.map((r) => ({
      id: r.id,
      title: r.title,
      fiscalYear: r.fiscalYear,
      totalBudget: r.totalBudget,
      allocatedBudget: r.allocatedBudget,
      spentBudget: r.spentBudget,
      status: r.status,
    }));

    return { data: overview, meta: { total: overview.length } };
  }

  async saveMeritMatrix(orgId: string, revisionId: string, meritMatrix: any) {
    const existing = await this.db
      .select()
      .from(schema.compensationRevisions)
      .where(and(eq(schema.compensationRevisions.id, revisionId), eq(schema.compensationRevisions.orgId, orgId), eq(schema.compensationRevisions.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compensation revision not found');

    const [row] = await this.db
      .update(schema.compensationRevisions)
      .set({ meritMatrix, updatedAt: new Date() })
      .where(and(eq(schema.compensationRevisions.id, revisionId), eq(schema.compensationRevisions.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
