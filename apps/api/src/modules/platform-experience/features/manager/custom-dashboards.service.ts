import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CustomDashboardsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listDashboards(orgId: string, userId: string) {
    const dashboards = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(
        eq(schema.customDashboards.orgId, orgId),
        eq(schema.customDashboards.createdById, userId),
        eq(schema.customDashboards.isActive, true),
      ))
      .orderBy(desc(schema.customDashboards.createdAt));

    return { data: dashboards, meta: { total: dashboards.length } };
  }

  async createDashboard(
    orgId: string,
    userId: string,
    dto: { name: string; description?: string; layout?: Record<string, any>; isDefault?: boolean },
  ) {
    const [row] = await this.db
      .insert(schema.customDashboards)
      .values({
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        createdById: userId,
        isDefault: dto.isDefault ?? false,
        layout: dto.layout ?? {},
      })
      .returning();

    return { data: row };
  }

  async updateDashboard(
    orgId: string,
    userId: string,
    id: string,
    dto: { name?: string; description?: string; layout?: Record<string, any>; isDefault?: boolean },
  ) {
    const existing = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(
        eq(schema.customDashboards.id, id),
        eq(schema.customDashboards.orgId, orgId),
        eq(schema.customDashboards.createdById, userId),
        eq(schema.customDashboards.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Dashboard not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.layout !== undefined) updateData.layout = dto.layout;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;

    const [row] = await this.db
      .update(schema.customDashboards)
      .set(updateData)
      .where(and(
        eq(schema.customDashboards.id, id),
        eq(schema.customDashboards.orgId, orgId),
      ))
      .returning();

    return { data: row };
  }

  async deleteDashboard(orgId: string, userId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(
        eq(schema.customDashboards.id, id),
        eq(schema.customDashboards.orgId, orgId),
        eq(schema.customDashboards.createdById, userId),
        eq(schema.customDashboards.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Dashboard not found');

    const [row] = await this.db
      .update(schema.customDashboards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(schema.customDashboards.id, id),
        eq(schema.customDashboards.orgId, orgId),
      ))
      .returning();

    // Also soft-delete associated widgets
    await this.db
      .update(schema.dashboardWidgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(schema.dashboardWidgets.dashboardId, id),
        eq(schema.dashboardWidgets.orgId, orgId),
      ));

    return { data: row };
  }

  async listWidgets(orgId: string, dashboardId: string) {
    const widgets = await this.db
      .select()
      .from(schema.dashboardWidgets)
      .where(and(
        eq(schema.dashboardWidgets.orgId, orgId),
        eq(schema.dashboardWidgets.dashboardId, dashboardId),
        eq(schema.dashboardWidgets.isActive, true),
      ))
      .orderBy(schema.dashboardWidgets.createdAt);

    return { data: widgets, meta: { total: widgets.length } };
  }

  async addWidget(
    orgId: string,
    dashboardId: string,
    dto: { widgetType: string; title: string; config?: Record<string, any>; position?: Record<string, any>; size?: Record<string, any> },
  ) {
    // Verify dashboard exists
    const dashboard = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(
        eq(schema.customDashboards.id, dashboardId),
        eq(schema.customDashboards.orgId, orgId),
        eq(schema.customDashboards.isActive, true),
      ));

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
      .where(and(
        eq(schema.dashboardWidgets.id, widgetId),
        eq(schema.dashboardWidgets.orgId, orgId),
        eq(schema.dashboardWidgets.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Widget not found');

    const [row] = await this.db
      .update(schema.dashboardWidgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(schema.dashboardWidgets.id, widgetId),
        eq(schema.dashboardWidgets.orgId, orgId),
      ))
      .returning();

    return { data: row };
  }

  async toggleShare(orgId: string, userId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.customDashboards)
      .where(and(
        eq(schema.customDashboards.id, id),
        eq(schema.customDashboards.orgId, orgId),
        eq(schema.customDashboards.createdById, userId),
        eq(schema.customDashboards.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Dashboard not found');

    const [row] = await this.db
      .update(schema.customDashboards)
      .set({
        isShared: !existing[0].isShared,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.customDashboards.id, id),
        eq(schema.customDashboards.orgId, orgId),
      ))
      .returning();

    return { data: row };
  }
}
