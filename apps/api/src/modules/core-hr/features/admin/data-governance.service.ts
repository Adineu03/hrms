import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { auditLogs } from '../../../../infrastructure/database/schema/audit-logs';
import { orgs } from '../../../../infrastructure/database/schema/orgs';

interface AuditLogFilters {
  entity?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

@Injectable()
export class DataGovernanceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getAuditLogs(orgId: string, filters: AuditLogFilters) {
    const conditions: any[] = [eq(auditLogs.orgId, orgId)];

    if (filters.entity) {
      conditions.push(eq(auditLogs.entity, filters.entity));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.from) {
      conditions.push(gte(auditLogs.createdAt, new Date(filters.from)));
    }
    if (filters.to) {
      conditions.push(lte(auditLogs.createdAt, new Date(filters.to)));
    }

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);

    // Get total count
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(...conditions));

    return {
      data: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId ?? undefined,
        oldValue: r.oldValue ?? undefined,
        newValue: r.newValue ?? undefined,
        description: r.description ?? undefined,
        ipAddress: r.ipAddress ?? undefined,
        userAgent: r.userAgent ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        total: countResult?.count ?? 0,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil((countResult?.count ?? 0) / filters.limit),
      },
    };
  }

  async getFieldAccess(orgId: string) {
    const [org] = await this.db
      .select({ config: orgs.config })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const config = (org?.config as Record<string, any>) ?? {};
    return config.fieldAccessRules ?? {};
  }

  async saveFieldAccess(orgId: string, rules: Record<string, any>) {
    const [org] = await this.db
      .select({ config: orgs.config })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const existingConfig = (org?.config as Record<string, any>) ?? {};
    const updatedConfig = { ...existingConfig, fieldAccessRules: rules };

    await this.db
      .update(orgs)
      .set({ config: updatedConfig, updatedAt: new Date() })
      .where(eq(orgs.id, orgId));

    return { success: true, rules };
  }

  async requestDataExport(orgId: string, data: {
    entity: string;
    fields: string[];
    filters?: Record<string, any>;
    format: string;
  }) {
    // Stub: in production this would create a background job via BullMQ
    // and return a job ID for the client to poll
    return {
      success: true,
      message: 'Data export request queued',
      exportId: crypto.randomUUID(),
      entity: data.entity,
      fields: data.fields,
      format: data.format,
      status: 'queued',
    };
  }

  async getConsent(orgId: string) {
    const [org] = await this.db
      .select({ config: orgs.config })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const config = (org?.config as Record<string, any>) ?? {};
    return {
      consentPolicy: config.gdprConsentPolicy ?? {},
      consentRecords: config.consentRecords ?? [],
    };
  }

  async recordConsent(
    orgId: string,
    employeeId: string,
    data: { action: string; details?: Record<string, any> },
  ) {
    const [org] = await this.db
      .select({ config: orgs.config })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const existingConfig = (org?.config as Record<string, any>) ?? {};
    const consentRecords = (existingConfig.consentRecords as any[]) ?? [];

    consentRecords.push({
      employeeId,
      action: data.action,
      details: data.details ?? {},
      recordedAt: new Date().toISOString(),
    });

    const updatedConfig = { ...existingConfig, consentRecords };

    await this.db
      .update(orgs)
      .set({ config: updatedConfig, updatedAt: new Date() })
      .where(eq(orgs.id, orgId));

    return { success: true, employeeId, action: data.action };
  }
}
