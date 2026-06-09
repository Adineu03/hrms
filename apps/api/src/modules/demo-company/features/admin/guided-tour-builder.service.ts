import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

interface RawTourStep {
  order?: number;
  title?: string;
  tooltipText?: string;
  tooltip?: string;
  targetSelector?: string;
}

@Injectable()
export class GuidedTourBuilderService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  private personaLabel(persona: string | null | undefined): string {
    const p = (persona ?? 'all').toLowerCase();
    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  private mapSteps(steps: unknown): Array<{ title: string; tooltip: string; targetSelector: string }> {
    if (!Array.isArray(steps)) return [];
    return (steps as RawTourStep[]).map((s) => ({
      title: s?.title ?? '',
      tooltip: s?.tooltipText ?? s?.tooltip ?? '',
      targetSelector: s?.targetSelector ?? '',
    }));
  }

  async getTours(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.demoTours)
      .where(and(eq(schema.demoTours.orgId, orgId), eq(schema.demoTours.isActive, true)))
      .orderBy(desc(schema.demoTours.updatedAt));

    const data = rows.map((row) => ({
      id: row.id,
      name: row.tourName,
      targetModule: row.targetModule,
      assignedPersona: this.personaLabel(row.assignedPersona),
      steps: this.mapSteps(row.steps),
      published: row.isPublished,
      completionCount: row.completionCount ?? 0,
    }));

    return { data, meta: { total: data.length } };
  }

  async createTour(
    orgId: string,
    body: {
      tourName: string;
      targetModule: string;
      assignedPersona: string;
      steps: Array<{ order: number; targetSelector: string; tooltipText: string; title: string }>;
    },
  ) {
    const [row] = await this.db
      .insert(schema.demoTours)
      .values({
        orgId,
        tourName: body.tourName,
        targetModule: body.targetModule,
        assignedPersona: body.assignedPersona ?? 'all',
        steps: body.steps,
        isPublished: false,
        completionCount: 0,
      })
      .returning();
    return { data: row };
  }

  async updateTour(orgId: string, id: string, body: Record<string, unknown>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.tourName !== undefined) updateData.tourName = String(body.tourName);
    if (body.targetModule !== undefined) updateData.targetModule = String(body.targetModule);
    if (body.assignedPersona !== undefined) updateData.assignedPersona = String(body.assignedPersona);
    if (body.steps !== undefined) updateData.steps = body.steps;

    const [row] = await this.db
      .update(schema.demoTours)
      .set(updateData as Parameters<ReturnType<typeof this.db.update>['set']>[0])
      .where(and(eq(schema.demoTours.id, id), eq(schema.demoTours.orgId, orgId)))
      .returning();
    return { data: row };
  }

  async publishTour(orgId: string, id: string) {
    const [current] = await this.db
      .select({ isPublished: schema.demoTours.isPublished })
      .from(schema.demoTours)
      .where(and(eq(schema.demoTours.id, id), eq(schema.demoTours.orgId, orgId)));

    const newPublishedState = !(current?.isPublished ?? false);

    const [row] = await this.db
      .update(schema.demoTours)
      .set({ isPublished: newPublishedState, updatedAt: new Date() })
      .where(and(eq(schema.demoTours.id, id), eq(schema.demoTours.orgId, orgId)))
      .returning();
    return { data: row };
  }

  async deleteTour(orgId: string, id: string) {
    await this.db
      .update(schema.demoTours)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.demoTours.id, id), eq(schema.demoTours.orgId, orgId)));
    return { data: { success: true } };
  }
}
