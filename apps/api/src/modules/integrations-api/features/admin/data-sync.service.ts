import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DataSyncService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listSyncConfigs(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.dataSyncConfigs)
      .where(and(eq(schema.dataSyncConfigs.orgId, orgId), eq(schema.dataSyncConfigs.isActive, true)))
      .orderBy(desc(schema.dataSyncConfigs.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createSyncConfig(
    orgId: string,
    dto: {
      connectorId?: string;
      syncName: string;
      sourceType: string;
      targetType: string;
      frequency?: string;
      fieldMapping?: Record<string, string>;
      filterCriteria?: Record<string, unknown>;
      isEnabled?: boolean;
    },
  ) {
    const [row] = await this.db
      .insert(schema.dataSyncConfigs)
      .values({
        orgId,
        connectorId: dto.connectorId ?? null,
        syncName: dto.syncName,
        sourceType: dto.sourceType,
        targetType: dto.targetType,
        frequency: dto.frequency ?? 'daily',
        fieldMapping: dto.fieldMapping ?? null,
        filterCriteria: dto.filterCriteria ?? null,
        isEnabled: dto.isEnabled ?? true,
      })
      .returning();

    return { data: row };
  }

  async getSyncConfig(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.dataSyncConfigs)
      .where(
        and(
          eq(schema.dataSyncConfigs.id, id),
          eq(schema.dataSyncConfigs.orgId, orgId),
          eq(schema.dataSyncConfigs.isActive, true),
        ),
      );

    if (!rows.length) throw new NotFoundException('Data sync config not found');

    return { data: rows[0] };
  }

  async updateSyncConfig(
    orgId: string,
    id: string,
    dto: {
      connectorId?: string;
      syncName?: string;
      sourceType?: string;
      targetType?: string;
      frequency?: string;
      fieldMapping?: Record<string, string>;
      filterCriteria?: Record<string, unknown>;
      isEnabled?: boolean;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.dataSyncConfigs)
      .where(
        and(
          eq(schema.dataSyncConfigs.id, id),
          eq(schema.dataSyncConfigs.orgId, orgId),
          eq(schema.dataSyncConfigs.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Data sync config not found');

    const [row] = await this.db
      .update(schema.dataSyncConfigs)
      .set({
        ...(dto.connectorId !== undefined && { connectorId: dto.connectorId }),
        ...(dto.syncName !== undefined && { syncName: dto.syncName }),
        ...(dto.sourceType !== undefined && { sourceType: dto.sourceType }),
        ...(dto.targetType !== undefined && { targetType: dto.targetType }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.fieldMapping !== undefined && { fieldMapping: dto.fieldMapping }),
        ...(dto.filterCriteria !== undefined && { filterCriteria: dto.filterCriteria }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.dataSyncConfigs.id, id), eq(schema.dataSyncConfigs.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteSyncConfig(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.dataSyncConfigs)
      .where(
        and(
          eq(schema.dataSyncConfigs.id, id),
          eq(schema.dataSyncConfigs.orgId, orgId),
          eq(schema.dataSyncConfigs.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Data sync config not found');

    const [row] = await this.db
      .update(schema.dataSyncConfigs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.dataSyncConfigs.id, id), eq(schema.dataSyncConfigs.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async triggerSync(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.dataSyncConfigs)
      .where(
        and(
          eq(schema.dataSyncConfigs.id, id),
          eq(schema.dataSyncConfigs.orgId, orgId),
          eq(schema.dataSyncConfigs.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Data sync config not found');

    const [row] = await this.db
      .update(schema.dataSyncConfigs)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
        lastSyncRecordCount: 0,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.dataSyncConfigs.id, id), eq(schema.dataSyncConfigs.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
