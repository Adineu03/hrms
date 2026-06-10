import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { buildUserNameMap } from '../../../../shared/database/user-names.util';

/** Maps audit-log entity values onto the HRMS module they belong to. */
const ENTITY_MODULE: Record<string, string> = {
  employee: 'Core HR',
  department: 'Core HR',
  document: 'Core HR',
  custom_field: 'Platform',
  leave_request: 'Leave Management',
  payroll_run: 'Payroll',
  salary_structure: 'Payroll',
  benefit_plan: 'Compensation',
};

@Injectable()
export class AuditTrailLoggingService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listAuditLogs(
    orgId: string,
    filters: {
      module?: string;
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [eq(schema.auditLogs.orgId, orgId)];

    if (filters.action) {
      conditions.push(eq(schema.auditLogs.action, filters.action));
    }
    if (filters.userId) {
      conditions.push(eq(schema.auditLogs.userId, filters.userId));
    }
    if (filters.module) {
      conditions.push(eq(schema.auditLogs.entity, filters.module));
    }

    const query = this.db
      .select()
      .from(schema.auditLogs)
      .where(and(...conditions))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    const rows = await query;
    const userNames = await buildUserNameMap(this.db, rows.map((r) => r.userId));

    const data = rows.map((r) => ({
      ...r,
      userName: (r.userId && userNames.get(r.userId)) || 'System',
      entityType: r.entity,
      module: ENTITY_MODULE[r.entity] ?? 'Platform',
    }));

    return { data, meta: { total: data.length, limit: filters.limit ?? 50, offset: filters.offset ?? 0 } };
  }

  async listTrailConfigs(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.auditTrailConfigs)
      .where(and(eq(schema.auditTrailConfigs.orgId, orgId), eq(schema.auditTrailConfigs.isActive, true)))
      .orderBy(schema.auditTrailConfigs.entity);

    // The tab renders `entityName`; the column is `entity`.
    return { data: rows.map((r) => ({ ...r, entityName: r.entity })), meta: { total: rows.length } };
  }

  async createTrailConfig(
    orgId: string,
    dto: {
      entity?: string;
      entityName?: string; // the admin tab's form field name
      retentionDays?: number;
      isTracked?: boolean;
      trackCreate?: boolean;
      trackUpdate?: boolean;
      trackDelete?: boolean;
      trackView?: boolean;
      trackExport?: boolean;
    },
  ) {
    const [row] = await this.db
      .insert(schema.auditTrailConfigs)
      .values({
        orgId,
        entity: dto.entity ?? dto.entityName ?? 'unspecified',
        retentionDays: dto.retentionDays ?? 365,
        isTracked: dto.isTracked ?? true,
        trackCreate: dto.trackCreate ?? true,
        trackUpdate: dto.trackUpdate ?? true,
        trackDelete: dto.trackDelete ?? true,
        trackView: dto.trackView ?? false,
        trackExport: dto.trackExport ?? true,
      })
      .returning();

    return { data: row };
  }

  async updateTrailConfig(
    orgId: string,
    id: string,
    dto: {
      entity?: string;
      retentionDays?: number;
      isTracked?: boolean;
      trackCreate?: boolean;
      trackUpdate?: boolean;
      trackDelete?: boolean;
      trackView?: boolean;
      trackExport?: boolean;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.auditTrailConfigs)
      .where(and(eq(schema.auditTrailConfigs.id, id), eq(schema.auditTrailConfigs.orgId, orgId), eq(schema.auditTrailConfigs.isActive, true)));

    if (!existing.length) throw new NotFoundException('Audit trail config not found');

    const [row] = await this.db
      .update(schema.auditTrailConfigs)
      .set({
        ...(dto.entity !== undefined && { entity: dto.entity }),
        ...(dto.retentionDays !== undefined && { retentionDays: dto.retentionDays }),
        ...(dto.isTracked !== undefined && { isTracked: dto.isTracked }),
        ...(dto.trackCreate !== undefined && { trackCreate: dto.trackCreate }),
        ...(dto.trackUpdate !== undefined && { trackUpdate: dto.trackUpdate }),
        ...(dto.trackDelete !== undefined && { trackDelete: dto.trackDelete }),
        ...(dto.trackView !== undefined && { trackView: dto.trackView }),
        ...(dto.trackExport !== undefined && { trackExport: dto.trackExport }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.auditTrailConfigs.id, id), eq(schema.auditTrailConfigs.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async exportAuditLogs(
    orgId: string,
    filters: {
      module?: string;
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const conditions = [eq(schema.auditLogs.orgId, orgId)];

    if (filters.action) {
      conditions.push(eq(schema.auditLogs.action, filters.action));
    }
    if (filters.userId) {
      conditions.push(eq(schema.auditLogs.userId, filters.userId));
    }
    if (filters.module) {
      conditions.push(eq(schema.auditLogs.entity, filters.module));
    }

    const rows = await this.db
      .select()
      .from(schema.auditLogs)
      .where(and(...conditions))
      .orderBy(schema.auditLogs.createdAt);

    return { data: rows, meta: { total: rows.length, exportedAt: new Date() } };
  }
}
