import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

type ClaimRow = typeof schema.reimbursementClaims.$inferSelect;

@Injectable()
export class ReimbursementsClaimsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  /** Map a DB row to the shape the employee tab renders (amount as number, processedAt derived). */
  private toClaimShape(r: ClaimRow) {
    return {
      id: r.id,
      type: r.type,
      amount: Number(r.amount) || 0,
      description: r.description,
      receiptName: r.receiptUrl ?? null,
      status: r.status,
      submittedAt: r.submittedAt ?? r.createdAt,
      processedAt: r.paidAt ?? r.approvedAt ?? null,
      remarks: r.remarks ?? null,
    };
  }

  async listClaims(orgId: string, userId: string) {
    // "Active" = in-flight claims: pending (awaiting decision) + approved (awaiting payout)
    const rows = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.employeeId, userId),
          eq(schema.reimbursementClaims.isActive, true),
          inArray(schema.reimbursementClaims.status, ['pending', 'approved']),
        ),
      )
      .orderBy(desc(schema.reimbursementClaims.createdAt));

    return { data: rows.map((r) => this.toClaimShape(r)), meta: { total: rows.length } };
  }

  async submitClaim(
    orgId: string,
    userId: string,
    dto: {
      type: string;
      amount: string | number;
      description: string;
      receiptUrl?: string;
      receiptName?: string;
    },
  ) {
    const receipt = dto.receiptUrl || dto.receiptName || null;
    const [row] = await this.db
      .insert(schema.reimbursementClaims)
      .values({
        orgId,
        employeeId: userId,
        type: dto.type,
        amount: String(dto.amount),
        description: dto.description,
        receiptUrl: receipt,
        status: 'pending',
        submittedAt: new Date(),
      })
      .returning();

    return { data: this.toClaimShape(row) };
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

    return { data: this.toClaimShape(rows[0]) };
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

    const totalApproved = approved.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalPaid = paid.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalPending = pending.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      data: rows.map((r) => this.toClaimShape(r)),
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
