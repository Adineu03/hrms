import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { buildUserNameMap } from '../../../../shared/database/user-names.util';

const EXPIRING_SOON_DAYS = 60;

@Injectable()
export class AuditSupportService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  /** Resolve the manager's direct reports by employeeProfiles.managerId === userId. */
  private async getTeamMembers(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .where(and(eq(schema.users.orgId, orgId), eq(schema.employeeProfiles.managerId, managerId)));
  }

  async generateTeamComplianceReport(orgId: string, userId: string) {
    const members = await this.getTeamMembers(orgId, userId);
    const employeeIds = members.map((m) => m.userId);
    const now = new Date();
    const period = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;

    const emptyReport = {
      period,
      generatedAt: now,
      managerId: userId,
      totalMembers: 0,
      compliantCount: 0,
      nonCompliantCount: 0,
      overdueTrainings: 0,
      pendingAcknowledgments: 0,
      openViolations: 0,
    };
    if (employeeIds.length === 0) return { data: emptyReport };

    const [trainingCompletions, acknowledgments, mandatoryPolicies, violations] = await Promise.all([
      this.db
        .select({ employeeId: schema.trainingCompletions.employeeId, status: schema.trainingCompletions.status })
        .from(schema.trainingCompletions)
        .where(
          and(
            eq(schema.trainingCompletions.orgId, orgId),
            eq(schema.trainingCompletions.isActive, true),
            inArray(schema.trainingCompletions.employeeId, employeeIds),
          ),
        ),
      this.db
        .select({ employeeId: schema.policyAcknowledgments.employeeId, policyId: schema.policyAcknowledgments.policyId })
        .from(schema.policyAcknowledgments)
        .where(
          and(
            eq(schema.policyAcknowledgments.orgId, orgId),
            eq(schema.policyAcknowledgments.isActive, true),
            inArray(schema.policyAcknowledgments.employeeId, employeeIds),
          ),
        ),
      this.db
        .select({ id: schema.compliancePolicies.id })
        .from(schema.compliancePolicies)
        .where(
          and(
            eq(schema.compliancePolicies.orgId, orgId),
            eq(schema.compliancePolicies.isActive, true),
            eq(schema.compliancePolicies.status, 'published'),
            eq(schema.compliancePolicies.mandatoryAcknowledgment, true),
          ),
        ),
      this.db
        .select({ id: schema.policyViolations.id, status: schema.policyViolations.status })
        .from(schema.policyViolations)
        .where(
          and(
            eq(schema.policyViolations.orgId, orgId),
            eq(schema.policyViolations.isActive, true),
            inArray(schema.policyViolations.employeeId, employeeIds),
          ),
        ),
    ]);

    const mandatoryPolicyIds = mandatoryPolicies.map((p) => p.id);
    let compliantCount = 0;
    let pendingAcknowledgments = 0;

    for (const m of members) {
      const myTrainings = trainingCompletions.filter((tc) => tc.employeeId === m.userId);
      const hasOverdue = myTrainings.some((tc) => tc.status === 'overdue');
      const myAckPolicyIds = new Set(
        acknowledgments.filter((a) => a.employeeId === m.userId).map((a) => a.policyId),
      );
      const myPendingAcks = mandatoryPolicyIds.filter((pid) => !myAckPolicyIds.has(pid)).length;
      pendingAcknowledgments += myPendingAcks;
      if (!hasOverdue && myPendingAcks === 0) compliantCount += 1;
    }

    const overdueTrainings = trainingCompletions.filter((tc) => tc.status === 'overdue').length;
    const openViolations = violations.filter((v) => v.status === 'open' || v.status === 'under_review').length;

    return {
      data: {
        ...emptyReport,
        totalMembers: members.length,
        compliantCount,
        nonCompliantCount: members.length - compliantCount,
        overdueTrainings,
        pendingAcknowledgments,
        openViolations,
      },
    };
  }

  async getTeamCertifications(orgId: string, userId: string) {
    const members = await this.getTeamMembers(orgId, userId);
    const employeeIds = members.map((m) => m.userId);
    if (employeeIds.length === 0) return { data: [], meta: { total: 0 } };

    const rows = await this.db
      .select()
      .from(schema.certifications)
      .where(
        and(
          eq(schema.certifications.orgId, orgId),
          eq(schema.certifications.isActive, true),
          inArray(schema.certifications.employeeId, employeeIds),
        ),
      )
      .orderBy(schema.certifications.expiryDate);

    const nameById = new Map(
      members.map((m) => [m.userId, `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Unknown']),
    );
    const now = Date.now();
    const soonCutoff = now + EXPIRING_SOON_DAYS * 86400000;

    const data = rows.map((r) => {
      const expiry = r.expiryDate ? new Date(r.expiryDate).getTime() : null;
      let status: 'active' | 'expiring_soon' | 'expired';
      if (r.status === 'expired' || (expiry !== null && expiry < now)) status = 'expired';
      else if (expiry !== null && expiry <= soonCutoff) status = 'expiring_soon';
      else status = 'active';

      return {
        id: r.id,
        employeeId: r.employeeId,
        employeeName: nameById.get(r.employeeId) ?? 'Unknown',
        certificationName: r.name,
        issuingBody: r.issuingBody ?? '—',
        issuedDate: r.issueDate ?? r.createdAt,
        expiryDate: r.expiryDate ?? r.renewalDate ?? r.createdAt,
        status,
      };
    });

    return { data, meta: { total: data.length } };
  }

  async getEvidenceDashboard(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.auditEvidence)
      .where(and(eq(schema.auditEvidence.orgId, orgId), eq(schema.auditEvidence.isActive, true)))
      .orderBy(desc(schema.auditEvidence.createdAt));

    const nameMap = await buildUserNameMap(this.db, rows.map((r) => r.collectedBy));

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description ?? '',
      collectedDate: r.collectedAt ?? r.createdAt,
      collectedBy: r.collectedBy ? (nameMap.get(r.collectedBy) ?? 'Unknown') : '—',
      status: r.status,
      fileCount: Number(r.fileCount) || 0,
      relatedAuditName: r.relatedAuditName,
    }));

    return { data, meta: { total: data.length } };
  }
}
