import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ComplianceReportingService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getComplianceDashboard(orgId: string) {
    const [acknowledgments, trainingCompletions, checklists, ethicsComplaints, policies] = await Promise.all([
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.isActive, true))),
      this.db
        .select()
        .from(schema.trainingCompletions)
        .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.isActive, true))),
      this.db
        .select()
        .from(schema.complianceChecklists)
        .where(and(eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true))),
      this.db
        .select()
        .from(schema.ethicsComplaints)
        .where(and(eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.isActive, true))),
      this.db
        .select()
        .from(schema.compliancePolicies)
        .where(and(eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true))),
    ]);

    const trainingByStatus = trainingCompletions.reduce(
      (acc, tc) => {
        acc[tc.status] = (acc[tc.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const checklistByStatus = checklists.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      data: {
        policies: {
          total: policies.length,
          published: policies.filter((p) => p.status === 'published').length,
          draft: policies.filter((p) => p.status === 'draft').length,
          archived: policies.filter((p) => p.status === 'archived').length,
        },
        acknowledgments: {
          total: acknowledgments.length,
        },
        trainings: {
          total: trainingCompletions.length,
          byStatus: trainingByStatus,
          completed: trainingCompletions.filter((tc) => tc.status === 'completed').length,
          overdue: trainingCompletions.filter((tc) => tc.status === 'overdue').length,
        },
        checklists: {
          total: checklists.length,
          byStatus: checklistByStatus,
          completed: checklists.filter((c) => c.status === 'completed').length,
          pending: checklists.filter((c) => c.status === 'pending').length,
        },
        ethics: {
          total: ethicsComplaints.length,
          open: ethicsComplaints.filter((e) => e.status !== 'closed').length,
          closed: ethicsComplaints.filter((e) => e.status === 'closed').length,
        },
      },
    };
  }

  async getTrainingCompletionReport(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.isActive, true)))
      .orderBy(schema.trainingCompletions.createdAt);

    const byStatus = rows.reduce(
      (acc, tc) => {
        acc[tc.status] = (acc[tc.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const completionRate = rows.length > 0 ? Math.round((rows.filter((r) => r.status === 'completed').length / rows.length) * 100) : 0;

    return {
      data: {
        total: rows.length,
        byStatus,
        completionRate,
        records: rows,
      },
      meta: { total: rows.length },
    };
  }

  async getPolicyAcknowledgmentReport(orgId: string) {
    const [acknowledgments, policies] = await Promise.all([
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.isActive, true))),
      this.db
        .select()
        .from(schema.compliancePolicies)
        .where(and(eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true), eq(schema.compliancePolicies.status, 'published'))),
    ]);

    const ackByPolicy = acknowledgments.reduce(
      (acc, ack) => {
        acc[ack.policyId] = (acc[ack.policyId] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const report = policies.map((p) => ({
      policyId: p.id,
      title: p.title,
      policyCode: p.policyCode,
      mandatoryAcknowledgment: p.mandatoryAcknowledgment,
      acknowledgmentCount: ackByPolicy[p.id] ?? 0,
    }));

    return { data: report, meta: { total: report.length } };
  }

  async getChecklistStatus(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(and(eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true)))
      .orderBy(schema.complianceChecklists.status);

    const byStatus = rows.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      data: {
        total: rows.length,
        byStatus,
        records: rows,
      },
      meta: { total: rows.length },
    };
  }

  async getRegulatoryFilingsTracker(orgId: string) {
    const now = new Date();

    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(and(eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true)))
      .orderBy(schema.complianceChecklists.dueDate);

    const upcoming = rows.filter((r) => r.dueDate && r.dueDate > now && r.status !== 'completed');
    const overdue = rows.filter((r) => r.dueDate && r.dueDate <= now && r.status !== 'completed');
    const completed = rows.filter((r) => r.status === 'completed');

    return {
      data: {
        upcoming,
        overdue,
        completed,
        summary: {
          total: rows.length,
          upcomingCount: upcoming.length,
          overdueCount: overdue.length,
          completedCount: completed.length,
        },
      },
    };
  }
}
