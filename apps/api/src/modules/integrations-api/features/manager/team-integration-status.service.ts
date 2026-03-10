import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamIntegrationStatusService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listTeamIntegrations(orgId: string) {
    const rows = await this.db
      .select({
        id: schema.integrationConnectors.id,
        connectorKey: schema.integrationConnectors.connectorKey,
        connectorName: schema.integrationConnectors.connectorName,
        category: schema.integrationConnectors.category,
        isEnabled: schema.integrationConnectors.isEnabled,
        isAuthenticated: schema.integrationConnectors.isAuthenticated,
        healthStatus: schema.integrationConnectors.healthStatus,
        lastSyncAt: schema.integrationConnectors.lastSyncAt,
        errorMessage: schema.integrationConnectors.errorMessage,
        usageCount: schema.integrationConnectors.usageCount,
      })
      .from(schema.integrationConnectors)
      .where(
        and(
          eq(schema.integrationConnectors.orgId, orgId),
          eq(schema.integrationConnectors.isEnabled, true),
          eq(schema.integrationConnectors.isActive, true),
        ),
      )
      .orderBy(desc(schema.integrationConnectors.lastSyncAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async flagSyncError(orgId: string, id: string, message: string) {
    const connector = await this.db
      .select()
      .from(schema.integrationConnectors)
      .where(
        and(
          eq(schema.integrationConnectors.id, id),
          eq(schema.integrationConnectors.orgId, orgId),
          eq(schema.integrationConnectors.isActive, true),
        ),
      );

    if (!connector.length) throw new NotFoundException('Connector not found');

    const [log] = await this.db
      .insert(schema.integrationLogs)
      .values({
        orgId,
        connectorId: id,
        eventType: 'error',
        status: 'failure',
        message,
      })
      .returning();

    return { data: log };
  }
}
