import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class InternalMobilityTransfersService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listTransfers(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)))
      .orderBy(desc(schema.internalTransferRequests.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async getTransfer(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    if (!rows.length) throw new NotFoundException('Transfer request not found');

    return { data: rows[0] };
  }

  async approveTransfer(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    if (!existing.length) throw new NotFoundException('Transfer request not found');

    const [row] = await this.db
      .update(schema.internalTransferRequests)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async rejectTransfer(orgId: string, id: string, dto: { rejectionReason?: string }) {
    const existing = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    if (!existing.length) throw new NotFoundException('Transfer request not found');

    const [row] = await this.db
      .update(schema.internalTransferRequests)
      .set({
        status: 'rejected',
        rejectionReason: dto.rejectionReason ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async completeTransfer(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    if (!existing.length) throw new NotFoundException('Transfer request not found');

    const [row] = await this.db
      .update(schema.internalTransferRequests)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getMobilityStats(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    const totalRequests = rows.length;
    const pendingCount = rows.filter((r) => r.status === 'pending').length;
    const approvedCount = rows.filter((r) => r.status === 'approved').length;
    const completedCount = rows.filter((r) => r.status === 'completed').length;
    const lateralMoves = rows.filter((r) => r.requestType === 'lateral_move').length;
    const promotions = rows.filter((r) => r.requestType === 'promotion').length;

    return {
      data: {
        totalRequests,
        pendingCount,
        approvedCount,
        completedCount,
        lateralMoves,
        promotions,
      },
    };
  }
}
