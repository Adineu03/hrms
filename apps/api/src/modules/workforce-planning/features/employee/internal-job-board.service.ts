import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class InternalJobBoardService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listOpenPositions(orgId: string) {
    // Open slots: headcount plans where approvedHeadcount > currentHeadcount
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(
        and(
          eq(schema.workforceHeadcountPlans.orgId, orgId),
          eq(schema.workforceHeadcountPlans.isActive, true),
          eq(schema.workforceHeadcountPlans.hiringFreezeActive, false),
          sql`${schema.workforceHeadcountPlans.approvedHeadcount} > ${schema.workforceHeadcountPlans.currentHeadcount}`,
        ),
      )
      .orderBy(desc(schema.workforceHeadcountPlans.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async getPosition(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.id, id), eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    if (!rows.length) throw new NotFoundException('Position not found');

    return { data: rows[0] };
  }

  async applyForPosition(orgId: string, userId: string, positionId: string, dto: { coverNote?: string }) {
    const position = await this.db
      .select()
      .from(schema.workforceHeadcountPlans)
      .where(and(eq(schema.workforceHeadcountPlans.id, positionId), eq(schema.workforceHeadcountPlans.orgId, orgId), eq(schema.workforceHeadcountPlans.isActive, true)));

    if (!position.length) throw new NotFoundException('Position not found');

    const [row] = await this.db
      .insert(schema.internalTransferRequests)
      .values({
        orgId,
        employeeId: userId,
        requestType: 'lateral_move',
        toDepartmentId: position[0].departmentId ?? null,
        reason: dto.coverNote ?? null,
        managerInitiated: false,
        initiatedBy: userId,
      })
      .returning();

    return { data: row };
  }
}
