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

    const data = rows.map((r) => ({
      id: r.id,
      name: r.connectorName ?? '',
      category: this.displayCategory(r.category),
      health: (r.healthStatus ?? 'unknown') as 'healthy' | 'degraded' | 'error' | 'unknown',
      enabled: !!r.isEnabled,
      description: r.description ?? '',
      logoInitial: this.logoInitial(r.connectorName),
    }));

    return { data, meta: { total: data.length } };
  }

  private displayCategory(category: string | null): string {
    const map: Record<string, string> = {
      hrms: 'HRMS',
      payroll: 'Payroll',
      erp: 'ERP',
      communication: 'Communication',
      other: 'Other',
    };
    return map[(category ?? '').toLowerCase()] ?? (category ?? 'Other');
  }

  private logoInitial(name: string | null): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
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
