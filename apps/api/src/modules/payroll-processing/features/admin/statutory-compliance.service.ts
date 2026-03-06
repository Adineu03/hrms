import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class StatutoryComplianceService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listFilings(orgId: string, filters?: { type?: string; period?: string; status?: string }) {
    const conditions = [
      eq(schema.statutoryFilings.orgId, orgId),
      eq(schema.statutoryFilings.isActive, true),
    ];

    if (filters?.type) {
      conditions.push(eq(schema.statutoryFilings.type, filters.type));
    }
    if (filters?.period) {
      conditions.push(eq(schema.statutoryFilings.period, filters.period));
    }
    if (filters?.status) {
      conditions.push(eq(schema.statutoryFilings.status, filters.status));
    }

    const rows = await this.db
      .select()
      .from(schema.statutoryFilings)
      .where(and(...conditions))
      .orderBy(desc(schema.statutoryFilings.dueDate));

    return { data: rows, meta: { total: rows.length } };
  }

  async createFiling(
    orgId: string,
    dto: { type: string; period: string; dueDate: string; amount?: string },
  ) {
    const [row] = await this.db
      .insert(schema.statutoryFilings)
      .values({
        orgId,
        type: dto.type,
        period: dto.period,
        dueDate: new Date(dto.dueDate),
        amount: dto.amount ?? '0',
        status: 'pending',
      })
      .returning();

    return { data: row };
  }

  async updateFiling(
    orgId: string,
    id: string,
    dto: { status?: string; challanNumber?: string; remarks?: string },
  ) {
    const existing = await this.db
      .select()
      .from(schema.statutoryFilings)
      .where(and(eq(schema.statutoryFilings.id, id), eq(schema.statutoryFilings.orgId, orgId), eq(schema.statutoryFilings.isActive, true)));

    if (!existing.length) throw new NotFoundException('Statutory filing not found');

    const [row] = await this.db
      .update(schema.statutoryFilings)
      .set({
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.challanNumber !== undefined && { challanNumber: dto.challanNumber }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.statutoryFilings.id, id), eq(schema.statutoryFilings.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async markAsFiled(
    orgId: string,
    id: string,
    dto: { challanNumber?: string; filedBy?: string },
  ) {
    const existing = await this.db
      .select()
      .from(schema.statutoryFilings)
      .where(and(eq(schema.statutoryFilings.id, id), eq(schema.statutoryFilings.orgId, orgId), eq(schema.statutoryFilings.isActive, true)));

    if (!existing.length) throw new NotFoundException('Statutory filing not found');

    const [row] = await this.db
      .update(schema.statutoryFilings)
      .set({
        status: 'filed',
        challanNumber: dto.challanNumber ?? null,
        filedBy: dto.filedBy ?? null,
        filedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.statutoryFilings.id, id), eq(schema.statutoryFilings.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getComplianceCalendar(orgId: string) {
    // Get upcoming filings due in the next 90 days
    const now = new Date();
    const rows = await this.db
      .select()
      .from(schema.statutoryFilings)
      .where(
        and(
          eq(schema.statutoryFilings.orgId, orgId),
          eq(schema.statutoryFilings.isActive, true),
          gte(schema.statutoryFilings.dueDate, now),
        ),
      )
      .orderBy(schema.statutoryFilings.dueDate)
      .limit(50);

    // Also check for overdue items
    const overdue = await this.db
      .select()
      .from(schema.statutoryFilings)
      .where(
        and(
          eq(schema.statutoryFilings.orgId, orgId),
          eq(schema.statutoryFilings.isActive, true),
          eq(schema.statutoryFilings.status, 'pending'),
          sql`${schema.statutoryFilings.dueDate} < ${now}`,
        ),
      )
      .orderBy(schema.statutoryFilings.dueDate);

    return {
      data: {
        upcoming: rows,
        overdue,
      },
      meta: { upcomingCount: rows.length, overdueCount: overdue.length },
    };
  }

  async listTaxProofs(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.taxProofs)
      .where(and(eq(schema.taxProofs.orgId, orgId), eq(schema.taxProofs.isActive, true)))
      .orderBy(desc(schema.taxProofs.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async verifyTaxProof(
    orgId: string,
    id: string,
    dto: { status: string; remarks?: string },
    verifiedBy?: string,
  ) {
    const existing = await this.db
      .select()
      .from(schema.taxProofs)
      .where(and(eq(schema.taxProofs.id, id), eq(schema.taxProofs.orgId, orgId), eq(schema.taxProofs.isActive, true)));

    if (!existing.length) throw new NotFoundException('Tax proof not found');

    const [row] = await this.db
      .update(schema.taxProofs)
      .set({
        status: dto.status,
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
        verifiedBy: verifiedBy ?? null,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.taxProofs.id, id), eq(schema.taxProofs.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
