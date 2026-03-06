import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ReimbursementsClaimsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listClaims(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.employeeId, userId),
          eq(schema.reimbursementClaims.isActive, true),
          eq(schema.reimbursementClaims.status, 'pending'),
        ),
      )
      .orderBy(desc(schema.reimbursementClaims.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async submitClaim(
    orgId: string,
    userId: string,
    dto: {
      type: string;
      amount: string;
      description: string;
      receiptUrl?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.reimbursementClaims)
      .values({
        orgId,
        employeeId: userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        receiptUrl: dto.receiptUrl ?? null,
        status: 'pending',
        submittedAt: new Date(),
      })
      .returning();

    return { data: row };
  }

  async getClaimDetail(orgId: string, userId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.id, id),
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.employeeId, userId),
          eq(schema.reimbursementClaims.isActive, true),
        ),
      );

    if (!rows.length) throw new NotFoundException('Reimbursement claim not found');

    return { data: rows[0] };
  }

  async getClaimHistory(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.employeeId, userId),
          eq(schema.reimbursementClaims.isActive, true),
        ),
      )
      .orderBy(desc(schema.reimbursementClaims.createdAt))
      .limit(100);

    // Summary by status
    const pending = rows.filter((r) => r.status === 'pending');
    const approved = rows.filter((r) => r.status === 'approved');
    const rejected = rows.filter((r) => r.status === 'rejected');
    const paid = rows.filter((r) => r.status === 'paid');

    const totalApproved = approved.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalPaid = paid.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalPending = pending.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    return {
      data: rows,
      meta: {
        total: rows.length,
        summary: {
          pendingCount: pending.length,
          pendingAmount: totalPending.toFixed(2),
          approvedCount: approved.length,
          approvedAmount: totalApproved.toFixed(2),
          rejectedCount: rejected.length,
          paidCount: paid.length,
          paidAmount: totalPaid.toFixed(2),
        },
      },
    };
  }
}
