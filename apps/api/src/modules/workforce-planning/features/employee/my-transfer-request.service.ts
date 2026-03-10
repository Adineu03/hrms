import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyTransferRequestService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyTransferRequests(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(
        and(
          eq(schema.internalTransferRequests.orgId, orgId),
          eq(schema.internalTransferRequests.employeeId, userId),
          eq(schema.internalTransferRequests.isActive, true),
        ),
      )
      .orderBy(desc(schema.internalTransferRequests.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async submitMyTransferRequest(
    orgId: string,
    userId: string,
    dto: {
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
        employeeId: userId,
        requestType: dto.requestType,
        toDepartmentId: dto.toDepartmentId ?? null,
        toLocationId: dto.toLocationId ?? null,
        toDesignationId: dto.toDesignationId ?? null,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        reason: dto.reason ?? null,
        backfillRequired: dto.backfillRequired ?? false,
        managerInitiated: false,
        initiatedBy: userId,
      })
      .returning();

    return { data: row };
  }

  async getMyTransferRequest(orgId: string, userId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(
        and(
          eq(schema.internalTransferRequests.id, id),
          eq(schema.internalTransferRequests.orgId, orgId),
          eq(schema.internalTransferRequests.employeeId, userId),
          eq(schema.internalTransferRequests.isActive, true),
        ),
      );

    if (!rows.length) throw new NotFoundException('Transfer request not found');

    return { data: rows[0] };
  }

  async cancelMyTransferRequest(orgId: string, userId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.internalTransferRequests)
      .where(
        and(
          eq(schema.internalTransferRequests.id, id),
          eq(schema.internalTransferRequests.orgId, orgId),
          eq(schema.internalTransferRequests.employeeId, userId),
          eq(schema.internalTransferRequests.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Transfer request not found');

    const [row] = await this.db
      .update(schema.internalTransferRequests)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(schema.internalTransferRequests.id, id), eq(schema.internalTransferRequests.orgId, orgId), eq(schema.internalTransferRequests.employeeId, userId)))
      .returning();

    return { data: row };
  }
}
