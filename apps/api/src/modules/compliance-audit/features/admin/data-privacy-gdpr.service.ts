import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DataPrivacyGdprService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPrivacySummary(orgId: string) {
    const [retentionConfigs, dsarRequests, breachNotifications, acknowledgments] = await Promise.all([
      this.db
        .select()
        .from(schema.auditTrailConfigs)
        .where(and(eq(schema.auditTrailConfigs.orgId, orgId), eq(schema.auditTrailConfigs.isActive, true))),
      this.db
        .select()
        .from(schema.auditLogs)
        .where(and(eq(schema.auditLogs.orgId, orgId), eq(schema.auditLogs.action, 'data_request'))),
      this.db
        .select()
        .from(schema.ethicsComplaints)
        .where(and(eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.category, 'data-breach'), eq(schema.ethicsComplaints.isActive, true))),
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.isActive, true))),
    ]);

    const pendingDsar = dsarRequests.filter((r) => r.action === 'data_request').length;

    return {
      data: {
        dataClassifications: retentionConfigs.map((c) => ({ entity: c.entity, retentionDays: c.retentionDays })),
        consentStats: {
          totalAcknowledgments: acknowledgments.length,
        },
        dsarPending: pendingDsar,
        retentionSchedules: retentionConfigs.map((c) => ({
          entity: c.entity,
          retentionDays: c.retentionDays,
          isTracked: c.isTracked,
        })),
        breachNotificationsCount: breachNotifications.length,
      },
    };
  }

  async listRetentionConfigs(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.auditTrailConfigs)
      .where(and(eq(schema.auditTrailConfigs.orgId, orgId), eq(schema.auditTrailConfigs.isActive, true)))
      .orderBy(schema.auditTrailConfigs.entity);

    return { data: rows, meta: { total: rows.length } };
  }

  async listDsarRequests(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.orgId, orgId), eq(schema.auditLogs.action, 'data_request')))
      .orderBy(schema.auditLogs.createdAt);

    return { data: rows, meta: { total: rows.length } };
  }

  async listBreachNotifications(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(
        and(
          eq(schema.ethicsComplaints.orgId, orgId),
          eq(schema.ethicsComplaints.category, 'data-breach'),
          eq(schema.ethicsComplaints.isActive, true),
        ),
      )
      .orderBy(schema.ethicsComplaints.createdAt);

    return { data: rows, meta: { total: rows.length } };
  }
}
