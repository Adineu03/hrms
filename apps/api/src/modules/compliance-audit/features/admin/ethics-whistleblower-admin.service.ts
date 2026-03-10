import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class EthicsWhistleblowerAdminService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listComplaints(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(and(eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.isActive, true)))
      .orderBy(schema.ethicsComplaints.createdAt);

    return { data: rows, meta: { total: rows.length } };
  }

  async getComplaint(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.isActive, true)));

    if (!rows.length) throw new NotFoundException('Ethics complaint not found');

    return { data: rows[0] };
  }

  async assignInvestigator(orgId: string, id: string, dto: { investigatorId: string }) {
    const existing = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.isActive, true)));

    if (!existing.length) throw new NotFoundException('Ethics complaint not found');

    const [row] = await this.db
      .update(schema.ethicsComplaints)
      .set({
        investigatorId: dto.investigatorId,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async updateComplaintStatus(orgId: string, id: string, dto: { status: string; investigationNotes?: string }) {
    const existing = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.isActive, true)));

    if (!existing.length) throw new NotFoundException('Ethics complaint not found');

    const [row] = await this.db
      .update(schema.ethicsComplaints)
      .set({
        status: dto.status,
        ...(dto.investigationNotes !== undefined && { investigationNotes: dto.investigationNotes }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async closeComplaint(orgId: string, id: string, dto: { outcome: string }) {
    const existing = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.isActive, true)));

    if (!existing.length) throw new NotFoundException('Ethics complaint not found');

    const [row] = await this.db
      .update(schema.ethicsComplaints)
      .set({
        status: 'closed',
        outcome: dto.outcome,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getEthicsAnalytics(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(and(eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.isActive, true)));

    const byStatus = rows.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byCategory = rows.reduce(
      (acc, row) => {
        acc[row.category] = (acc[row.category] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      data: {
        total: rows.length,
        byStatus,
        byCategory,
        openComplaints: rows.filter((r) => r.status !== 'closed').length,
        closedComplaints: rows.filter((r) => r.status === 'closed').length,
      },
    };
  }
}
