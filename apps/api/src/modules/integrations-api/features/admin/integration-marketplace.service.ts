import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class IntegrationMarketplaceService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listConnectors(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.integrationConnectors)
      .where(and(eq(schema.integrationConnectors.orgId, orgId), eq(schema.integrationConnectors.isActive, true)))
      .orderBy(desc(schema.integrationConnectors.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createConnector(
    orgId: string,
    dto: {
      connectorKey: string;
      connectorName: string;
      category: string;
      description?: string;
      authType?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.integrationConnectors)
      .values({
        orgId,
        connectorKey: dto.connectorKey,
        connectorName: dto.connectorName,
        category: dto.category,
        description: dto.description ?? null,
        authType: dto.authType ?? 'oauth',
      })
      .returning();

    return { data: row };
  }

  async getConnector(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.integrationConnectors)
      .where(
        and(
          eq(schema.integrationConnectors.id, id),
          eq(schema.integrationConnectors.orgId, orgId),
          eq(schema.integrationConnectors.isActive, true),
        ),
      );

    if (!rows.length) throw new NotFoundException('Connector not found');

    return { data: rows[0] };
  }

  async enableConnector(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.integrationConnectors)
      .where(
        and(
          eq(schema.integrationConnectors.id, id),
          eq(schema.integrationConnectors.orgId, orgId),
          eq(schema.integrationConnectors.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Connector not found');

    const [row] = await this.db
      .update(schema.integrationConnectors)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(and(eq(schema.integrationConnectors.id, id), eq(schema.integrationConnectors.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async disableConnector(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.integrationConnectors)
      .where(
        and(
          eq(schema.integrationConnectors.id, id),
          eq(schema.integrationConnectors.orgId, orgId),
          eq(schema.integrationConnectors.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Connector not found');

    const [row] = await this.db
      .update(schema.integrationConnectors)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(and(eq(schema.integrationConnectors.id, id), eq(schema.integrationConnectors.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async reauthConnector(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.integrationConnectors)
      .where(
        and(
          eq(schema.integrationConnectors.id, id),
          eq(schema.integrationConnectors.orgId, orgId),
          eq(schema.integrationConnectors.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Connector not found');

    const [row] = await this.db
      .update(schema.integrationConnectors)
      .set({ isAuthenticated: false, healthStatus: 'unknown', updatedAt: new Date() })
      .where(and(eq(schema.integrationConnectors.id, id), eq(schema.integrationConnectors.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getConnectorLogs(orgId: string, id: string) {
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

    const rows = await this.db
      .select()
      .from(schema.integrationLogs)
      .where(and(eq(schema.integrationLogs.connectorId, id), eq(schema.integrationLogs.orgId, orgId)))
      .orderBy(desc(schema.integrationLogs.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }
}
