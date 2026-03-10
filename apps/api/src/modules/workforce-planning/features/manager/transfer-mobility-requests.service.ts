import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TransferMobilityRequestsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listTeamTransferRequests(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)))
      .orderBy(desc(schema.internalTransferRequests.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async submitTransferRequest(
    orgId: string,
    userId: string,
    dto: {
      employeeId: string;
      requestType: string;
      toDepartmentId?: string;
      toLocationId?: string;
      toDesignationId?: string;
      effectiveDate?: string;
      reason?: string;
      backfillRequired?: boolean;
    },
  ) {
    const [row] = await this.db
      .insert(schema.internalTransferRequests)
      .values({
        orgId,
        employeeId: dto.employeeId,
        requestType: dto.requestType,
        toDepartmentId: dto.toDepartmentId ?? null,
        toLocationId: dto.toLocationId ?? null,
        toDesignationId: dto.toDesignationId ?? null,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        reason: dto.reason ?? null,
        backfillRequired: dto.backfillRequired ?? false,
        managerInitiated: true,
        initiatedBy: userId,
      })
      .returning();

    return { data: row };
  }

  async getTransferRequest(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    if (!rows.length) throw new NotFoundException('Transfer request not found');

    return { data: rows[0] };
  }

  async markBackfillInProgress(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.isActive, true)));

    if (!existing.length) throw new NotFoundException('Transfer request not found');

    const [row] = await this.db
      .update(schema.internalTransferRequests)
      .set({ backfillStatus: 'in_progress', updatedAt: new Date() })
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
