import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DocumentRetentionService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listRetentionConfigs(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.auditTrailConfigs)
      .where(and(eq(schema.auditTrailConfigs.orgId, orgId), eq(schema.auditTrailConfigs.isActive, true)))
      .orderBy(schema.auditTrailConfigs.entity);

    return { data: rows, meta: { total: rows.length } };
  }

  async createRetentionConfig(
    orgId: string,
    dto: {
      entity: string;
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
        entity: dto.entity,
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

  async updateRetentionConfig(
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

    if (!existing.length) throw new NotFoundException('Retention config not found');

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

  async getRetentionSchedules(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.auditTrailConfigs)
      .where(and(eq(schema.auditTrailConfigs.orgId, orgId), eq(schema.auditTrailConfigs.isActive, true)))
      .orderBy(schema.auditTrailConfigs.retentionDays);

    const schedules = rows.map((r) => ({
      entity: r.entity,
      retentionDays: r.retentionDays,
      retentionYears: Math.round((r.retentionDays / 365) * 10) / 10,
      isTracked: r.isTracked,
    }));

    return { data: schedules, meta: { total: schedules.length } };
  }

  async applyLegalHold(orgId: string, dto: { entityType: string; entityId: string; reason: string }) {
    const [row] = await this.db
      .insert(schema.auditLogs)
      .values({
        orgId,
        userId: orgId, // system action uses orgId as userId placeholder
        action: 'legal_hold',
        entity: dto.entityType,
        entityId: dto.entityId,
        description: dto.reason,
        newValue: { reason: dto.reason, entityType: dto.entityType, entityId: dto.entityId },
      })
      .returning();

    return { data: row };
  }
}
