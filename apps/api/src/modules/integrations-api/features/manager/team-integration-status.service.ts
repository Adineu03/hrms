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

    const data = rows.map((r) => ({
      id: r.id,
      connectorName: r.connectorName ?? '',
      category: this.displayCategory(r.category),
      health: (r.healthStatus ?? 'unknown') as 'healthy' | 'degraded' | 'error' | 'unknown',
      lastSync: r.lastSyncAt ? this.fmtDateTime(r.lastSyncAt) : 'Never',
      errorMessage: r.errorMessage ?? undefined,
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

  private fmtDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
