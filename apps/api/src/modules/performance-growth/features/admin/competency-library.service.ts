import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CompetencyLibraryService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listCompetencies(orgId: string, filters: { status?: string; category?: string }) {
    const conditions: any[] = [eq(schema.competencyFrameworks.orgId, orgId), eq(schema.competencyFrameworks.isActive, true)];
    if (filters.status) conditions.push(eq(schema.competencyFrameworks.status, filters.status));
    if (filters.category) conditions.push(eq(schema.competencyFrameworks.category, filters.category));
    const rows = await this.db.select().from(schema.competencyFrameworks).where(and(...conditions)).orderBy(desc(schema.competencyFrameworks.createdAt));
    return { data: rows, meta: { total: rows.length } };
  }

  async createCompetency(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.competencyFrameworks).values({
      orgId, name: data.name, description: data.description ?? null, category: data.category ?? null,
      proficiencyLevels: data.proficiencyLevels ?? [], departmentIds: data.departmentIds ?? [],
      gradeIds: data.gradeIds ?? [], roleMapping: data.roleMapping ?? {}, isDefault: data.isDefault ?? false,
      status: data.status ?? 'draft', createdBy, metadata: data.metadata ?? {},
    }).returning();
    return created;
  }

  async getCompetency(orgId: string, id: string) {
    const [row] = await this.db.select().from(schema.competencyFrameworks)
      .where(and(eq(schema.competencyFrameworks.id, id), eq(schema.competencyFrameworks.orgId, orgId))).limit(1);
    if (!row) throw new NotFoundException('Competency not found');
    return row;
  }

  async updateCompetency(orgId: string, id: string, data: Record<string, any>) {
    await this.getCompetency(orgId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = ['name', 'description', 'category', 'proficiencyLevels', 'departmentIds', 'gradeIds', 'roleMapping', 'isDefault', 'status', 'metadata'];
    for (const f of fields) { if (data[f] !== undefined) updates[f] = data[f]; }
    await this.db.update(schema.competencyFrameworks).set(updates).where(and(eq(schema.competencyFrameworks.id, id), eq(schema.competencyFrameworks.orgId, orgId)));
    return this.getCompetency(orgId, id);
  }

  async deleteCompetency(orgId: string, id: string) {
    await this.getCompetency(orgId, id);
    await this.db.update(schema.competencyFrameworks).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.competencyFrameworks.id, id), eq(schema.competencyFrameworks.orgId, orgId)));
    return { success: true, message: 'Competency deleted' };
  }

  async importCompetencies(orgId: string, createdBy: string, competencies: Record<string, any>[]) {
    const created = [];
    for (const c of competencies) {
      const [row] = await this.db.insert(schema.competencyFrameworks).values({
        orgId, name: c.name, description: c.description ?? null, category: c.category ?? null,
        proficiencyLevels: c.proficiencyLevels ?? [], departmentIds: c.departmentIds ?? [],
        gradeIds: c.gradeIds ?? [], roleMapping: c.roleMapping ?? {}, status: 'active', createdBy,
      }).returning();
      created.push(row);
    }
    return { success: true, imported: created.length, data: created };
  }

  async exportCompetencies(orgId: string) {
    const rows = await this.db.select().from(schema.competencyFrameworks)
      .where(and(eq(schema.competencyFrameworks.orgId, orgId), eq(schema.competencyFrameworks.isActive, true)));
    return { data: rows, meta: { total: rows.length, exportedAt: new Date().toISOString() } };
  }
}
