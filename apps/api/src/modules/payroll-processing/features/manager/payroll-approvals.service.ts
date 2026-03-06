import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PayrollApprovalsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));
    return teamMembers.map((m) => m.userId);
  }

  async getPendingApprovals(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { reimbursements: [], overtime: [] }, meta: { total: 0 } };
    }

    // Pending reimbursement claims from team
    const reimbursements = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.status, 'pending'),
          eq(schema.reimbursementClaims.isActive, true),
          sql`${schema.reimbursementClaims.employeeId} = ANY(${teamMemberIds})`,
        ),
      )
      .orderBy(desc(schema.reimbursementClaims.createdAt));

    // Pending overtime requests from team
    const overtime = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.status, 'pending'),
          sql`${schema.overtimeRequests.employeeId} = ANY(${teamMemberIds})`,
        ),
      )
      .orderBy(desc(schema.overtimeRequests.createdAt));

    return {
      data: {
        reimbursements,
        overtime,
      },
      meta: { total: reimbursements.length + overtime.length },
    };
  }

  async approveItem(orgId: string, managerId: string, type: string, id: string) {
    if (type === 'reimbursement') {
      return this.approveReimbursement(orgId, managerId, id);
    }
    if (type === 'overtime') {
      return this.approveOvertime(orgId, managerId, id);
    }
    throw new NotFoundException(`Unknown approval type: ${type}`);
  }

  async rejectItem(orgId: string, managerId: string, type: string, id: string, remarks?: string) {
    if (type === 'reimbursement') {
      return this.rejectReimbursement(orgId, managerId, id, remarks);
    }
    if (type === 'overtime') {
      return this.rejectOvertime(orgId, managerId, id, remarks);
    }
    throw new NotFoundException(`Unknown approval type: ${type}`);
  }

  private async approveReimbursement(orgId: string, managerId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.id, id),
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Reimbursement claim not found');

    const [row] = await this.db
      .update(schema.reimbursementClaims)
      .set({
        status: 'approved',
        approvedBy: managerId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.reimbursementClaims.id, id), eq(schema.reimbursementClaims.orgId, orgId)))
      .returning();

    return { data: row };
  }

  private async rejectReimbursement(orgId: string, managerId: string, id: string, remarks?: string) {
    const existing = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.id, id),
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Reimbursement claim not found');

    const [row] = await this.db
      .update(schema.reimbursementClaims)
      .set({
        status: 'rejected',
        remarks: remarks ?? null,
        approvedBy: managerId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.reimbursementClaims.id, id), eq(schema.reimbursementClaims.orgId, orgId)))
      .returning();

    return { data: row };
  }

  private async approveOvertime(orgId: string, managerId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.id, id),
          eq(schema.overtimeRequests.orgId, orgId),
        ),
      );

    if (!existing.length) throw new NotFoundException('Overtime request not found');

    const [row] = await this.db
      .update(schema.overtimeRequests)
      .set({
        status: 'approved',
        reviewedBy: managerId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.overtimeRequests.id, id), eq(schema.overtimeRequests.orgId, orgId)))
      .returning();

    return { data: row };
  }

  private async rejectOvertime(orgId: string, managerId: string, id: string, remarks?: string) {
    const existing = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.id, id),
          eq(schema.overtimeRequests.orgId, orgId),
        ),
      );

    if (!existing.length) throw new NotFoundException('Overtime request not found');

    const [row] = await this.db
      .update(schema.overtimeRequests)
      .set({
        status: 'rejected',
        reviewerComment: remarks ?? null,
        reviewedBy: managerId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.overtimeRequests.id, id), eq(schema.overtimeRequests.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getApprovalHistory(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (!teamMemberIds.length) {
      return { data: { reimbursements: [], overtime: [] }, meta: { total: 0 } };
    }

    // Past reimbursement approvals/rejections
    const reimbursements = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.approvedBy, managerId),
          eq(schema.reimbursementClaims.isActive, true),
        ),
      )
      .orderBy(desc(schema.reimbursementClaims.approvedAt))
      .limit(50);

    // Past overtime approvals/rejections
    const overtime = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.reviewedBy, managerId),
        ),
      )
      .orderBy(desc(schema.overtimeRequests.reviewedAt))
      .limit(50);

    return {
      data: { reimbursements, overtime },
      meta: { total: reimbursements.length + overtime.length },
    };
  }
}
