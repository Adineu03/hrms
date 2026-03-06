import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PaySlipsTaxService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listPaySlips(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.paySlips)
      .where(and(
        eq(schema.paySlips.orgId, orgId),
        eq(schema.paySlips.employeeId, userId),
        eq(schema.paySlips.isActive, true),
      ))
      .orderBy(desc(schema.paySlips.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async downloadPaySlip(orgId: string, userId: string, id: string) {
    const paySlips = await this.db
      .select()
      .from(schema.paySlips)
      .where(and(
        eq(schema.paySlips.id, id),
        eq(schema.paySlips.orgId, orgId),
        eq(schema.paySlips.employeeId, userId),
        eq(schema.paySlips.isActive, true),
      ));

    if (!paySlips.length) throw new NotFoundException('Pay slip not found');

    return {
      data: {
        id: paySlips[0].id,
        month: paySlips[0].month,
        year: paySlips[0].year,
        downloadUrl: paySlips[0].downloadUrl,
        grossEarnings: paySlips[0].grossEarnings,
        totalDeductions: paySlips[0].totalDeductions,
        netPay: paySlips[0].netPay,
        basicSalary: paySlips[0].basicSalary,
        hra: paySlips[0].hra,
        da: paySlips[0].da,
        specialAllowance: paySlips[0].specialAllowance,
        otherEarnings: paySlips[0].otherEarnings,
        pfDeduction: paySlips[0].pfDeduction,
        esiDeduction: paySlips[0].esiDeduction,
        ptDeduction: paySlips[0].ptDeduction,
        incomeTax: paySlips[0].incomeTax,
        otherDeductions: paySlips[0].otherDeductions,
        status: paySlips[0].status,
      },
    };
  }

  async getTaxComputation(orgId: string, userId: string) {
    // Get the latest investment declaration
    const declarations = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(and(
        eq(schema.investmentDeclarations.orgId, orgId),
        eq(schema.investmentDeclarations.employeeId, userId),
        eq(schema.investmentDeclarations.isActive, true),
      ))
      .orderBy(desc(schema.investmentDeclarations.createdAt))
      .limit(1);

    // Get pay slips for the current fiscal year
    const paySlips = await this.db
      .select()
      .from(schema.paySlips)
      .where(and(
        eq(schema.paySlips.orgId, orgId),
        eq(schema.paySlips.employeeId, userId),
        eq(schema.paySlips.isActive, true),
      ))
      .orderBy(desc(schema.paySlips.createdAt));

    const totalIncomeTax = paySlips.reduce((sum, ps) => sum + Number(ps.incomeTax ?? 0), 0);
    const totalGrossEarnings = paySlips.reduce((sum, ps) => sum + Number(ps.grossEarnings ?? 0), 0);

    return {
      data: {
        declaration: declarations[0] ?? null,
        taxRegime: declarations[0]?.taxRegime ?? 'new',
        totalDeclared: declarations[0]?.totalDeclared ?? '0',
        totalVerified: declarations[0]?.totalVerified ?? '0',
        totalIncomeTaxDeducted: totalIncomeTax,
        totalGrossEarnings,
        paySlipCount: paySlips.length,
      },
    };
  }

  async getInvestmentDeclaration(orgId: string, userId: string) {
    const declarations = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(and(
        eq(schema.investmentDeclarations.orgId, orgId),
        eq(schema.investmentDeclarations.employeeId, userId),
        eq(schema.investmentDeclarations.isActive, true),
      ))
      .orderBy(desc(schema.investmentDeclarations.createdAt))
      .limit(1);

    return { data: declarations[0] ?? null };
  }

  async submitInvestmentDeclaration(orgId: string, userId: string, dto: {
    fiscalYear: string;
    taxRegime?: string;
    section80c?: any;
    section80d?: any;
    hraExemption?: any;
    otherDeductions?: any;
    totalDeclared?: string;
  }) {
    // Check if declaration already exists for this fiscal year
    const existing = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(and(
        eq(schema.investmentDeclarations.orgId, orgId),
        eq(schema.investmentDeclarations.employeeId, userId),
        eq(schema.investmentDeclarations.fiscalYear, dto.fiscalYear),
        eq(schema.investmentDeclarations.isActive, true),
      ));

    if (existing.length) {
      // Update existing
      const [row] = await this.db
        .update(schema.investmentDeclarations)
        .set({
          ...(dto.taxRegime !== undefined && { taxRegime: dto.taxRegime }),
          ...(dto.section80c !== undefined && { section80c: dto.section80c }),
          ...(dto.section80d !== undefined && { section80d: dto.section80d }),
          ...(dto.hraExemption !== undefined && { hraExemption: dto.hraExemption }),
          ...(dto.otherDeductions !== undefined && { otherDeductions: dto.otherDeductions }),
          ...(dto.totalDeclared !== undefined && { totalDeclared: dto.totalDeclared }),
          status: 'submitted',
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.investmentDeclarations.id, existing[0].id))
        .returning();

      return { data: row };
    }

    const [row] = await this.db
      .insert(schema.investmentDeclarations)
      .values({
        orgId,
        employeeId: userId,
        fiscalYear: dto.fiscalYear,
        taxRegime: dto.taxRegime ?? 'new',
        section80c: dto.section80c ?? {},
        section80d: dto.section80d ?? {},
        hraExemption: dto.hraExemption ?? {},
        otherDeductions: dto.otherDeductions ?? {},
        totalDeclared: dto.totalDeclared ?? '0',
        status: 'submitted',
        submittedAt: new Date(),
      })
      .returning();

    return { data: row };
  }

  async getTaxRegime(orgId: string, userId: string) {
    const declarations = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(and(
        eq(schema.investmentDeclarations.orgId, orgId),
        eq(schema.investmentDeclarations.employeeId, userId),
        eq(schema.investmentDeclarations.isActive, true),
      ))
      .orderBy(desc(schema.investmentDeclarations.createdAt))
      .limit(1);

    return { data: { taxRegime: declarations[0]?.taxRegime ?? 'new' } };
  }

  async selectTaxRegime(orgId: string, userId: string, dto: { taxRegime: 'old' | 'new'; fiscalYear: string }) {
    // Check if declaration exists for this fiscal year
    const existing = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(and(
        eq(schema.investmentDeclarations.orgId, orgId),
        eq(schema.investmentDeclarations.employeeId, userId),
        eq(schema.investmentDeclarations.fiscalYear, dto.fiscalYear),
        eq(schema.investmentDeclarations.isActive, true),
      ));

    if (existing.length) {
      const [row] = await this.db
        .update(schema.investmentDeclarations)
        .set({ taxRegime: dto.taxRegime, updatedAt: new Date() })
        .where(eq(schema.investmentDeclarations.id, existing[0].id))
        .returning();

      return { data: row };
    }

    const [row] = await this.db
      .insert(schema.investmentDeclarations)
      .values({
        orgId,
        employeeId: userId,
        fiscalYear: dto.fiscalYear,
        taxRegime: dto.taxRegime,
        status: 'draft',
      })
      .returning();

    return { data: row };
  }
}
