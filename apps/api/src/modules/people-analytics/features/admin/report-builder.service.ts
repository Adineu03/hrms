import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ReportBuilderService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getReports(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.analyticsReports)
      .where(and(eq(schema.analyticsReports.orgId, orgId), eq(schema.analyticsReports.isActive, true)))
      .orderBy(desc(schema.analyticsReports.updatedAt));
    return { data: rows, meta: { total: rows.length } };
  }

  async createReport(orgId: string, body: Record<string, unknown>) {
    const [row] = await this.db
      .insert(schema.analyticsReports)
      .values({
        orgId,
        name: String(body.name ?? 'Untitled Report'),
        description: body.description ? String(body.description) : null,
        reportType: String(body.reportType ?? 'table'),
        sourceModules: (body.sourceModules ?? []) as string[],
        selectedFields: (body.selectedFields ?? {}) as Record<string, unknown>,
        filters: (body.filters ?? null) as Record<string, unknown> | null,
        schedule: (body.schedule ?? null) as Record<string, unknown> | null,
        isShared: Boolean(body.isShared ?? false),
        createdBy: String(body.createdBy ?? ''),
      })
      .returning();
    return { data: row };
  }

  async deleteReport(orgId: string, id: string) {
    await this.db
      .update(schema.analyticsReports)
      .set({ isActive: false })
      .where(and(eq(schema.analyticsReports.id, id), eq(schema.analyticsReports.orgId, orgId)));
    return { data: { success: true } };
  }
}
