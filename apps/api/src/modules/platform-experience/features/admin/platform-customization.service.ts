import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PlatformCustomizationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listDashboards(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(eq(schema.customDashboards.orgId, orgId), eq(schema.customDashboards.isActive, true)))
      .orderBy(desc(schema.customDashboards.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createDashboard(orgId: string, dto: { name: string; description?: string; createdById: string; isDefault?: boolean; isShared?: boolean; layout?: any }) {
    const [row] = await this.db
      .insert(schema.customDashboards)
      .values({
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        createdById: dto.createdById,
        isDefault: dto.isDefault ?? false,
        isShared: dto.isShared ?? false,
        layout: dto.layout ?? {},
      })
      .returning();

    return { data: row };
  }

  async updateDashboard(orgId: string, id: string, dto: { name?: string; description?: string; isDefault?: boolean; isShared?: boolean; layout?: any }) {
    const existing = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(eq(schema.customDashboards.id, id), eq(schema.customDashboards.orgId, orgId), eq(schema.customDashboards.isActive, true)));

    if (!existing.length) throw new NotFoundException('Dashboard not found');

    const [row] = await this.db
      .update(schema.customDashboards)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isShared !== undefined && { isShared: dto.isShared }),
        ...(dto.layout !== undefined && { layout: dto.layout }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.customDashboards.id, id), eq(schema.customDashboards.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteDashboard(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(eq(schema.customDashboards.id, id), eq(schema.customDashboards.orgId, orgId), eq(schema.customDashboards.isActive, true)));

    if (!existing.length) throw new NotFoundException('Dashboard not found');

    const [row] = await this.db
      .update(schema.customDashboards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.customDashboards.id, id), eq(schema.customDashboards.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async listWidgets(orgId: string, dashboardId: string) {
    // Verify dashboard exists and belongs to this org
    const dashboard = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(eq(schema.customDashboards.id, dashboardId), eq(schema.customDashboards.orgId, orgId), eq(schema.customDashboards.isActive, true)));

    if (!dashboard.length) throw new NotFoundException('Dashboard not found');

    const rows = await this.db
      .select()
      .from(schema.dashboardWidgets)
      .where(and(eq(schema.dashboardWidgets.orgId, orgId), eq(schema.dashboardWidgets.dashboardId, dashboardId), eq(schema.dashboardWidgets.isActive, true)))
      .orderBy(desc(schema.dashboardWidgets.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async addWidget(orgId: string, dashboardId: string, dto: { widgetType: string; title: string; config?: any; position?: any; size?: any }) {
    // Verify dashboard exists and belongs to this org
    const dashboard = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(eq(schema.customDashboards.id, dashboardId), eq(schema.customDashboards.orgId, orgId), eq(schema.customDashboards.isActive, true)));

    if (!dashboard.length) throw new NotFoundException('Dashboard not found');

    const [row] = await this.db
      .insert(schema.dashboardWidgets)
      .values({
        orgId,
        dashboardId,
        widgetType: dto.widgetType,
        title: dto.title,
        config: dto.config ?? {},
        position: dto.position ?? {},
        size: dto.size ?? {},
      })
      .returning();

    return { data: row };
  }

  async removeWidget(orgId: string, widgetId: string) {
    const existing = await this.db
      .select()
      .from(schema.dashboardWidgets)
      .where(and(eq(schema.dashboardWidgets.id, widgetId), eq(schema.dashboardWidgets.orgId, orgId), eq(schema.dashboardWidgets.isActive, true)));

    if (!existing.length) throw new NotFoundException('Widget not found');

    const [row] = await this.db
      .update(schema.dashboardWidgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.dashboardWidgets.id, widgetId), eq(schema.dashboardWidgets.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
