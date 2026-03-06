import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SalaryStructureConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listSalaryStructures(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.salaryStructures)
      .where(and(eq(schema.salaryStructures.orgId, orgId), eq(schema.salaryStructures.isActive, true)))
      .orderBy(desc(schema.salaryStructures.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createSalaryStructure(orgId: string, dto: { name: string; description?: string; components?: any[] }) {
    const [row] = await this.db
      .insert(schema.salaryStructures)
      .values({
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        components: dto.components ?? [],
      })
      .returning();

    return { data: row };
  }

  async updateSalaryStructure(orgId: string, id: string, dto: { name?: string; description?: string; components?: any[] }) {
    const existing = await this.db
      .select()
      .from(schema.salaryStructures)
      .where(and(eq(schema.salaryStructures.id, id), eq(schema.salaryStructures.orgId, orgId), eq(schema.salaryStructures.isActive, true)));

    if (!existing.length) throw new NotFoundException('Salary structure not found');

    const [row] = await this.db
      .update(schema.salaryStructures)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.components !== undefined && { components: dto.components }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.salaryStructures.id, id), eq(schema.salaryStructures.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteSalaryStructure(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.salaryStructures)
      .where(and(eq(schema.salaryStructures.id, id), eq(schema.salaryStructures.orgId, orgId), eq(schema.salaryStructures.isActive, true)));

    if (!existing.length) throw new NotFoundException('Salary structure not found');

    const [row] = await this.db
      .update(schema.salaryStructures)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.salaryStructures.id, id), eq(schema.salaryStructures.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getPayBands(orgId: string) {
    const moduleConfig = await this.db
      .select()
      .from(schema.orgModules)
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'compensation-rewards')));

    const config = (moduleConfig[0]?.config as Record<string, any>) ?? {};
    return { data: config.payBands ?? [] };
  }

  async savePayBands(orgId: string, payBands: any[]) {
    const moduleConfig = await this.db
      .select()
      .from(schema.orgModules)
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'compensation-rewards')));

    if (!moduleConfig.length) throw new NotFoundException('Module configuration not found');

    const existingConfig = (moduleConfig[0].config as Record<string, any>) ?? {};
    const [row] = await this.db
      .update(schema.orgModules)
      .set({
        config: { ...existingConfig, payBands },
        updatedAt: new Date(),
      })
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'compensation-rewards')))
      .returning();

    return { data: row };
  }

  async getStatutoryConfig(orgId: string) {
    const moduleConfig = await this.db
      .select()
      .from(schema.orgModules)
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'compensation-rewards')));

    const config = (moduleConfig[0]?.config as Record<string, any>) ?? {};
    return { data: config.statutory ?? {} };
  }

  async saveStatutoryConfig(orgId: string, statutory: { pf?: any; esi?: any; pt?: any; lwf?: any }) {
    const moduleConfig = await this.db
      .select()
      .from(schema.orgModules)
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'compensation-rewards')));

    if (!moduleConfig.length) throw new NotFoundException('Module configuration not found');

    const existingConfig = (moduleConfig[0].config as Record<string, any>) ?? {};
    const [row] = await this.db
      .update(schema.orgModules)
      .set({
        config: { ...existingConfig, statutory },
        updatedAt: new Date(),
      })
      .where(and(eq(schema.orgModules.orgId, orgId), eq(schema.orgModules.moduleId, 'compensation-rewards')))
      .returning();

    return { data: row };
  }
}
