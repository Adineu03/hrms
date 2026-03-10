import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class AuditSupportService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async generateTeamComplianceReport(orgId: string, userId: string) {
    const [trainingCompletions, acknowledgments] = await Promise.all([
      this.db
        .select()
        .from(schema.trainingCompletions)
        .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.isActive, true))),
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.isActive, true))),
    ]);

    const trainingByStatus = trainingCompletions.reduce(
      (acc, tc) => {
        acc[tc.status] = (acc[tc.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const completionRate = trainingCompletions.length > 0 ? Math.round((trainingCompletions.filter((tc) => tc.status === 'completed').length / trainingCompletions.length) * 100) : 0;

    return {
      data: {
        reportGeneratedAt: new Date(),
        managerId: userId,
        trainings: {
          total: trainingCompletions.length,
          byStatus: trainingByStatus,
          completionRate,
        },
        acknowledgments: {
          total: acknowledgments.length,
        },
        overallComplianceScore: completionRate,
      },
    };
  }

  async getTeamCertifications(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(
        and(
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.status, 'completed'),
          eq(schema.trainingCompletions.isActive, true),
        ),
      )
      .orderBy(schema.trainingCompletions.completedAt);

    const certifications = rows.filter((r) => r.certificateUrl !== null).map((r) => ({
      employeeId: r.employeeId,
      trainingId: r.trainingId,
      completedAt: r.completedAt,
      certificateUrl: r.certificateUrl,
      renewalDue: r.renewalDue,
      passed: r.passed,
      score: r.score,
    }));

    return { data: certifications, meta: { total: certifications.length } };
  }

  async getEvidenceDashboard(orgId: string, userId: string) {
    const [trainingCompletions, acknowledgments, checklists] = await Promise.all([
      this.db
        .select()
        .from(schema.trainingCompletions)
        .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.status, 'completed'), eq(schema.trainingCompletions.isActive, true))),
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.isActive, true))),
      this.db
        .select()
        .from(schema.complianceChecklists)
        .where(and(eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.status, 'completed'), eq(schema.complianceChecklists.isActive, true))),
    ]);

    return {
      data: {
        managerId: userId,
        evidence: {
          completedTrainings: trainingCompletions.length,
          policyAcknowledgments: acknowledgments.length,
          completedChecklists: checklists.length,
          totalEvidenceItems: trainingCompletions.length + acknowledgments.length + checklists.length,
        },
      },
    };
  }
}
