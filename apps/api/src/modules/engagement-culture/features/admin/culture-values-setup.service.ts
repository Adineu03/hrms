import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CultureValuesSetupService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listCultureValues(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.cultureValues)
      .where(and(eq(schema.cultureValues.orgId, orgId), eq(schema.cultureValues.isActive, true)))
      .orderBy(asc(schema.cultureValues.sortOrder));

    return { data: rows, meta: { total: rows.length } };
  }

  async createCultureValue(orgId: string, dto: { name: string; description?: string; icon?: string }) {
    // Get the max sort order to place the new value at the end
    const existing = await this.db
      .select({ maxOrder: sql<number>`coalesce(max(${schema.cultureValues.sortOrder}), 0)` })
      .from(schema.cultureValues)
      .where(and(eq(schema.cultureValues.orgId, orgId), eq(schema.cultureValues.isActive, true)));

    const nextOrder = Number(existing[0]?.maxOrder ?? 0) + 1;

    const [row] = await this.db
      .insert(schema.cultureValues)
      .values({
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        sortOrder: nextOrder,
      })
      .returning();

    return { data: row };
  }

  async updateCultureValue(orgId: string, id: string, dto: { name?: string; description?: string; icon?: string }) {
    const existing = await this.db
      .select()
      .from(schema.cultureValues)
      .where(and(eq(schema.cultureValues.id, id), eq(schema.cultureValues.orgId, orgId), eq(schema.cultureValues.isActive, true)));

    if (!existing.length) throw new NotFoundException('Culture value not found');

    const [row] = await this.db
      .update(schema.cultureValues)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.cultureValues.id, id), eq(schema.cultureValues.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteCultureValue(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.cultureValues)
      .where(and(eq(schema.cultureValues.id, id), eq(schema.cultureValues.orgId, orgId), eq(schema.cultureValues.isActive, true)));

    if (!existing.length) throw new NotFoundException('Culture value not found');

    const [row] = await this.db
      .update(schema.cultureValues)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.cultureValues.id, id), eq(schema.cultureValues.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async reorderValues(orgId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.db
        .update(schema.cultureValues)
        .set({ sortOrder: index + 1, updatedAt: new Date() })
        .where(and(eq(schema.cultureValues.id, id), eq(schema.cultureValues.orgId, orgId))),
    );

    await Promise.all(updates);

    // Return the reordered list
    const rows = await this.db
      .select()
      .from(schema.cultureValues)
      .where(and(eq(schema.cultureValues.orgId, orgId), eq(schema.cultureValues.isActive, true)))
      .orderBy(asc(schema.cultureValues.sortOrder));

    return { data: rows, meta: { total: rows.length } };
  }

  async getCultureDashboard(orgId: string) {
    // Culture values with recognition counts
    const values = await this.db
      .select()
      .from(schema.cultureValues)
      .where(and(eq(schema.cultureValues.orgId, orgId), eq(schema.cultureValues.isActive, true)))
      .orderBy(asc(schema.cultureValues.sortOrder));

    // Latest engagement scores
    const latestScores = await this.db
      .select({
        avgScore: sql<number>`avg(${schema.engagementScores.overallScore})`,
        avgEnps: sql<number>`avg(${schema.engagementScores.enpsScore})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.engagementScores)
      .where(and(eq(schema.engagementScores.orgId, orgId), eq(schema.engagementScores.isActive, true)));

    // Recognition count from nominations
    const recognitionCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitionNominations)
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
        eq(schema.recognitionNominations.status, 'approved'),
      ));

    return {
      data: {
        values,
        metrics: {
          averageEngagementScore: Math.round(Number(latestScores[0]?.avgScore ?? 0)),
          averageEnps: Math.round(Number(latestScores[0]?.avgEnps ?? 0)),
          totalScoreRecords: Number(latestScores[0]?.count ?? 0),
          totalRecognitions: Number(recognitionCount[0]?.count ?? 0),
        },
      },
    };
  }
}
