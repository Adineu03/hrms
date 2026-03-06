import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PayrollConfigurationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  // --- Salary Components ---

  async listComponents(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.salaryComponents)
      .where(and(eq(schema.salaryComponents.orgId, orgId), eq(schema.salaryComponents.isActive, true)))
      .orderBy(schema.salaryComponents.sortOrder);

    return { data: rows, meta: { total: rows.length } };
  }

  async createComponent(
    orgId: string,
    dto: {
      name: string;
      type: string;
      category: string;
      calculationType: string;
      calculationValue?: string;
      percentageOf?: string;
      isStatutory?: boolean;
      isTaxable?: boolean;
      sortOrder?: number;
    },
  ) {
    const [row] = await this.db
      .insert(schema.salaryComponents)
      .values({
        orgId,
        name: dto.name,
        type: dto.type,
        category: dto.category,
        calculationType: dto.calculationType,
        calculationValue: dto.calculationValue ?? '0',
        percentageOf: dto.percentageOf ?? null,
        isStatutory: dto.isStatutory ?? false,
        isTaxable: dto.isTaxable ?? true,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();

    return { data: row };
  }

  async updateComponent(
    orgId: string,
    id: string,
    dto: {
      name?: string;
      type?: string;
      category?: string;
      calculationType?: string;
      calculationValue?: string;
      percentageOf?: string;
      isStatutory?: boolean;
      isTaxable?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.salaryComponents)
      .where(and(eq(schema.salaryComponents.id, id), eq(schema.salaryComponents.orgId, orgId), eq(schema.salaryComponents.isActive, true)));

    if (!existing.length) throw new NotFoundException('Salary component not found');

    const [row] = await this.db
      .update(schema.salaryComponents)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.calculationType !== undefined && { calculationType: dto.calculationType }),
        ...(dto.calculationValue !== undefined && { calculationValue: dto.calculationValue }),
        ...(dto.percentageOf !== undefined && { percentageOf: dto.percentageOf }),
        ...(dto.isStatutory !== undefined && { isStatutory: dto.isStatutory }),
        ...(dto.isTaxable !== undefined && { isTaxable: dto.isTaxable }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.salaryComponents.id, id), eq(schema.salaryComponents.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteComponent(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.salaryComponents)
      .where(and(eq(schema.salaryComponents.id, id), eq(schema.salaryComponents.orgId, orgId), eq(schema.salaryComponents.isActive, true)));

    if (!existing.length) throw new NotFoundException('Salary component not found');

    const [row] = await this.db
      .update(schema.salaryComponents)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.salaryComponents.id, id), eq(schema.salaryComponents.orgId, orgId)))
      .returning();

    return { data: row };
  }

  // --- Payroll Config ---

  async getConfig(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.payrollConfigs)
      .where(and(eq(schema.payrollConfigs.orgId, orgId), eq(schema.payrollConfigs.isActive, true)))
      .limit(1);

    if (!rows.length) {
      // Return sensible defaults
      return {
        data: {
          payrollCycleDay: 1,
          paymentDay: 28,
          taxRegime: 'new',
          pfEnabled: true,
          pfEmployerRate: '12.00',
          pfEmployeeRate: '12.00',
          esiEnabled: true,
          esiEmployerRate: '3.25',
          esiEmployeeRate: '0.75',
          ptEnabled: true,
          lwfEnabled: false,
          autoProcessEnabled: false,
          approvalRequired: true,
        },
      };
    }

    return { data: rows[0] };
  }

  async upsertConfig(
    orgId: string,
    dto: {
      payrollCycleDay?: number;
      paymentDay?: number;
      taxRegime?: string;
      pfEnabled?: boolean;
      pfEmployerRate?: string;
      pfEmployeeRate?: string;
      esiEnabled?: boolean;
      esiEmployerRate?: string;
      esiEmployeeRate?: string;
      ptEnabled?: boolean;
      lwfEnabled?: boolean;
      autoProcessEnabled?: boolean;
      approvalRequired?: boolean;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.payrollConfigs)
      .where(and(eq(schema.payrollConfigs.orgId, orgId), eq(schema.payrollConfigs.isActive, true)))
      .limit(1);

    if (existing.length) {
      const [row] = await this.db
        .update(schema.payrollConfigs)
        .set({
          ...(dto.payrollCycleDay !== undefined && { payrollCycleDay: dto.payrollCycleDay }),
          ...(dto.paymentDay !== undefined && { paymentDay: dto.paymentDay }),
          ...(dto.taxRegime !== undefined && { taxRegime: dto.taxRegime }),
          ...(dto.pfEnabled !== undefined && { pfEnabled: dto.pfEnabled }),
          ...(dto.pfEmployerRate !== undefined && { pfEmployerRate: dto.pfEmployerRate }),
          ...(dto.pfEmployeeRate !== undefined && { pfEmployeeRate: dto.pfEmployeeRate }),
          ...(dto.esiEnabled !== undefined && { esiEnabled: dto.esiEnabled }),
          ...(dto.esiEmployerRate !== undefined && { esiEmployerRate: dto.esiEmployerRate }),
          ...(dto.esiEmployeeRate !== undefined && { esiEmployeeRate: dto.esiEmployeeRate }),
          ...(dto.ptEnabled !== undefined && { ptEnabled: dto.ptEnabled }),
          ...(dto.lwfEnabled !== undefined && { lwfEnabled: dto.lwfEnabled }),
          ...(dto.autoProcessEnabled !== undefined && { autoProcessEnabled: dto.autoProcessEnabled }),
          ...(dto.approvalRequired !== undefined && { approvalRequired: dto.approvalRequired }),
          updatedAt: new Date(),
        })
        .where(and(eq(schema.payrollConfigs.id, existing[0].id), eq(schema.payrollConfigs.orgId, orgId)))
        .returning();

      return { data: row };
    }

    // Create new config
    const [row] = await this.db
      .insert(schema.payrollConfigs)
      .values({
        orgId,
        payrollCycleDay: dto.payrollCycleDay ?? 1,
        paymentDay: dto.paymentDay ?? 28,
        taxRegime: dto.taxRegime ?? 'new',
        pfEnabled: dto.pfEnabled ?? true,
        pfEmployerRate: dto.pfEmployerRate ?? '12.00',
        pfEmployeeRate: dto.pfEmployeeRate ?? '12.00',
        esiEnabled: dto.esiEnabled ?? true,
        esiEmployerRate: dto.esiEmployerRate ?? '3.25',
        esiEmployeeRate: dto.esiEmployeeRate ?? '0.75',
        ptEnabled: dto.ptEnabled ?? true,
        lwfEnabled: dto.lwfEnabled ?? false,
        autoProcessEnabled: dto.autoProcessEnabled ?? false,
        approvalRequired: dto.approvalRequired ?? true,
      })
      .returning();

    return { data: row };
  }
}
