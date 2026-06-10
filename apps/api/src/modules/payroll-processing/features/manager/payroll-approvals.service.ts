import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, inArray, ne } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { buildUserNameMap } from '../../../../shared/database/user-names.util';

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
      return { data: [], meta: { total: 0 } };
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
          inArray(schema.reimbursementClaims.employeeId, teamMemberIds),
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
          inArray(schema.overtimeRequests.employeeId, teamMemberIds),
        ),
      )
      .orderBy(desc(schema.overtimeRequests.createdAt));

    const nameMap = await buildUserNameMap(this.db, [
      ...reimbursements.map((r) => r.employeeId),
      ...overtime.map((o) => o.employeeId),
    ]);

    // Flatten into the single list the tab renders (type drives the approve/reject route)
    const items = [
      ...reimbursements.map((r) => ({
        id: r.id,
        type: 'reimbursement',
        employeeId: r.employeeId,
        employeeName: nameMap.get(r.employeeId) ?? 'Unknown',
        amount: Number(r.amount) || 0,
        hours: null as number | null,
        description: r.description,
        submittedAt: r.submittedAt ?? r.createdAt,
      })),
      ...overtime.map((o) => ({
        id: o.id,
        type: 'overtime',
        employeeId: o.employeeId,
        employeeName: nameMap.get(o.employeeId) ?? 'Unknown',
        amount: null as number | null,
        hours: o.actualHours ?? o.estimatedHours ?? 0,
        description: o.reason ? `${o.reason} (${o.date})` : `Overtime on ${o.date}`,
        submittedAt: o.createdAt,
      })),
    ].sort(
      (a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime(),
    );

    return { data: items, meta: { total: items.length } };
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
      return { data: [], meta: { total: 0 } };
    }

    // Decided reimbursement claims from the team (approved / rejected / paid)
    const reimbursements = await this.db
      .select()
      .from(schema.reimbursementClaims)
      .where(
        and(
          eq(schema.reimbursementClaims.orgId, orgId),
          eq(schema.reimbursementClaims.isActive, true),
          ne(schema.reimbursementClaims.status, 'pending'),
          inArray(schema.reimbursementClaims.employeeId, teamMemberIds),
        ),
      )
      .orderBy(desc(schema.reimbursementClaims.approvedAt))
      .limit(50);

    // Decided overtime requests from the team
    const overtime = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.orgId, orgId),
          ne(schema.overtimeRequests.status, 'pending'),
          inArray(schema.overtimeRequests.employeeId, teamMemberIds),
        ),
      )
      .orderBy(desc(schema.overtimeRequests.reviewedAt))
      .limit(50);

    const nameMap = await buildUserNameMap(this.db, [
      ...reimbursements.map((r) => r.employeeId),
      ...overtime.map((o) => o.employeeId),
    ]);

    const items = [
      ...reimbursements.map((r) => ({
        id: r.id,
        type: 'reimbursement',
        employeeId: r.employeeId,
        employeeName: nameMap.get(r.employeeId) ?? 'Unknown',
        amount: Number(r.amount) || 0,
        hours: null as number | null,
        status: r.status,
        actionAt: r.paidAt ?? r.approvedAt ?? r.updatedAt,
        remarks: r.remarks ?? null,
      })),
      ...overtime.map((o) => ({
        id: o.id,
        type: 'overtime',
        employeeId: o.employeeId,
        employeeName: nameMap.get(o.employeeId) ?? 'Unknown',
        amount: null as number | null,
        hours: o.actualHours ?? o.estimatedHours ?? 0,
        status: o.status,
        actionAt: o.reviewedAt ?? o.updatedAt,
        remarks: o.reviewerComment ?? null,
      })),
    ]
      .sort((a, b) => new Date(b.actionAt ?? 0).getTime() - new Date(a.actionAt ?? 0).getTime())
      .slice(0, 50);

    return { data: items, meta: { total: items.length } };
  }
}
