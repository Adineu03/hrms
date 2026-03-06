import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TaxManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listDeclarations(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(
        and(
          eq(schema.investmentDeclarations.orgId, orgId),
          eq(schema.investmentDeclarations.employeeId, userId),
          eq(schema.investmentDeclarations.isActive, true),
        ),
      )
      .orderBy(desc(schema.investmentDeclarations.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createDeclaration(
    orgId: string,
    userId: string,
    dto: {
      fiscalYear: string;
      taxRegime: string;
      section80c?: Record<string, any>;
      section80d?: Record<string, any>;
      hraExemption?: Record<string, any>;
      otherDeductions?: Record<string, any>;
    },
  ) {
    // Calculate total declared
    const s80c = Object.values(dto.section80c ?? {}).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);
    const s80d = Object.values(dto.section80d ?? {}).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);
    const hra = Object.values(dto.hraExemption ?? {}).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);
    const other = Object.values(dto.otherDeductions ?? {}).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);
    const totalDeclared = s80c + s80d + hra + other;

    const [row] = await this.db
      .insert(schema.investmentDeclarations)
      .values({
        orgId,
        employeeId: userId,
        fiscalYear: dto.fiscalYear,
        taxRegime: dto.taxRegime,
        section80c: dto.section80c ?? {},
        section80d: dto.section80d ?? {},
        hraExemption: dto.hraExemption ?? {},
        otherDeductions: dto.otherDeductions ?? {},
        totalDeclared: totalDeclared.toFixed(2),
        status: 'submitted',
        submittedAt: new Date(),
      })
      .returning();

    return { data: row };
  }

  async updateDeclaration(
    orgId: string,
    userId: string,
    id: string,
    dto: {
      taxRegime?: string;
      section80c?: Record<string, any>;
      section80d?: Record<string, any>;
      hraExemption?: Record<string, any>;
      otherDeductions?: Record<string, any>;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(
        and(
          eq(schema.investmentDeclarations.id, id),
          eq(schema.investmentDeclarations.orgId, orgId),
          eq(schema.investmentDeclarations.employeeId, userId),
          eq(schema.investmentDeclarations.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Investment declaration not found');
    if (existing[0].status === 'locked') {
      throw new NotFoundException('Declaration is locked and cannot be updated');
    }

    // Recalculate total
    const s80c = dto.section80c ?? (existing[0].section80c as Record<string, any>);
    const s80d = dto.section80d ?? (existing[0].section80d as Record<string, any>);
    const hra = dto.hraExemption ?? (existing[0].hraExemption as Record<string, any>);
    const other = dto.otherDeductions ?? (existing[0].otherDeductions as Record<string, any>);

    const totalDeclared =
      Object.values(s80c).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0) +
      Object.values(s80d).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0) +
      Object.values(hra).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0) +
      Object.values(other).reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);

    const [row] = await this.db
      .update(schema.investmentDeclarations)
      .set({
        ...(dto.taxRegime !== undefined && { taxRegime: dto.taxRegime }),
        ...(dto.section80c !== undefined && { section80c: dto.section80c }),
        ...(dto.section80d !== undefined && { section80d: dto.section80d }),
        ...(dto.hraExemption !== undefined && { hraExemption: dto.hraExemption }),
        ...(dto.otherDeductions !== undefined && { otherDeductions: dto.otherDeductions }),
        totalDeclared: totalDeclared.toFixed(2),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.investmentDeclarations.id, id),
          eq(schema.investmentDeclarations.orgId, orgId),
          eq(schema.investmentDeclarations.employeeId, userId),
        ),
      )
      .returning();

    return { data: row };
  }

  async getDeclarationDetail(orgId: string, userId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(
        and(
          eq(schema.investmentDeclarations.id, id),
          eq(schema.investmentDeclarations.orgId, orgId),
          eq(schema.investmentDeclarations.employeeId, userId),
          eq(schema.investmentDeclarations.isActive, true),
        ),
      );

    if (!rows.length) throw new NotFoundException('Investment declaration not found');

    // Get associated tax proofs
    const proofs = await this.db
      .select()
      .from(schema.taxProofs)
      .where(
        and(
          eq(schema.taxProofs.orgId, orgId),
          eq(schema.taxProofs.employeeId, userId),
          eq(schema.taxProofs.declarationId, id),
          eq(schema.taxProofs.isActive, true),
        ),
      )
      .orderBy(schema.taxProofs.section);

    return { data: { ...rows[0], proofs } };
  }

  async submitTaxProof(
    orgId: string,
    userId: string,
    dto: {
      declarationId: string;
      section: string;
      description: string;
      declaredAmount?: string;
      proofAmount?: string;
      documentUrl?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.taxProofs)
      .values({
        orgId,
        employeeId: userId,
        declarationId: dto.declarationId,
        section: dto.section,
        description: dto.description,
        declaredAmount: dto.declaredAmount ?? '0',
        proofAmount: dto.proofAmount ?? '0',
        documentUrl: dto.documentUrl ?? null,
        status: 'pending',
      })
      .returning();

    return { data: row };
  }

  async listTaxProofs(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.taxProofs)
      .where(
        and(
          eq(schema.taxProofs.orgId, orgId),
          eq(schema.taxProofs.employeeId, userId),
          eq(schema.taxProofs.isActive, true),
        ),
      )
      .orderBy(desc(schema.taxProofs.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async getTaxComputation(orgId: string, userId: string) {
    // Get the latest declaration
    const declarations = await this.db
      .select()
      .from(schema.investmentDeclarations)
      .where(
        and(
          eq(schema.investmentDeclarations.orgId, orgId),
          eq(schema.investmentDeclarations.employeeId, userId),
          eq(schema.investmentDeclarations.isActive, true),
        ),
      )
      .orderBy(desc(schema.investmentDeclarations.createdAt))
      .limit(1);

    // Get current salary info
    const salaryAssignment = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(
        and(
          eq(schema.employeeSalaryAssignments.orgId, orgId),
          eq(schema.employeeSalaryAssignments.employeeId, userId),
        ),
      )
      .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
      .limit(1);

    const ctc = parseFloat(salaryAssignment[0]?.ctc ?? '0');
    const annualCtc = ctc * 12;
    const totalDeclared = parseFloat(declarations[0]?.totalDeclared ?? '0');
    const taxableIncome = Math.max(0, annualCtc - totalDeclared);

    // Simplified tax computation (new regime)
    let taxAmount = 0;
    if (taxableIncome > 300000) {
      if (taxableIncome <= 700000) {
        taxAmount = (taxableIncome - 300000) * 0.05;
      } else if (taxableIncome <= 1000000) {
        taxAmount = 20000 + (taxableIncome - 700000) * 0.1;
      } else if (taxableIncome <= 1200000) {
        taxAmount = 50000 + (taxableIncome - 1000000) * 0.15;
      } else if (taxableIncome <= 1500000) {
        taxAmount = 80000 + (taxableIncome - 1200000) * 0.2;
      } else {
        taxAmount = 140000 + (taxableIncome - 1500000) * 0.3;
      }
    }

    const cess = taxAmount * 0.04;
    const totalTax = taxAmount + cess;

    // Get YTD tax already paid
    const payslips = await this.db
      .select()
      .from(schema.paySlips)
      .where(
        and(
          eq(schema.paySlips.orgId, orgId),
          eq(schema.paySlips.employeeId, userId),
          eq(schema.paySlips.year, new Date().getFullYear()),
          eq(schema.paySlips.isActive, true),
        ),
      );

    const ytdTaxPaid = payslips.reduce((sum, ps) => sum + parseFloat(ps.incomeTax ?? '0'), 0);
    const remainingTax = Math.max(0, totalTax - ytdTaxPaid);
    const monthsRemaining = 12 - payslips.length;
    const monthlyTax = monthsRemaining > 0 ? remainingTax / monthsRemaining : 0;

    return {
      data: {
        fiscalYear: declarations[0]?.fiscalYear ?? `FY${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}`,
        taxRegime: declarations[0]?.taxRegime ?? 'new',
        annualCtc: annualCtc.toFixed(2),
        totalDeductions: totalDeclared.toFixed(2),
        taxableIncome: taxableIncome.toFixed(2),
        taxBeforeCess: taxAmount.toFixed(2),
        cess: cess.toFixed(2),
        totalTaxLiability: totalTax.toFixed(2),
        ytdTaxPaid: ytdTaxPaid.toFixed(2),
        remainingTax: remainingTax.toFixed(2),
        estimatedMonthlyTax: monthlyTax.toFixed(2),
        note: 'This is an estimated computation. Actual tax may vary based on final declarations and proof verification.',
      },
    };
  }

  async getForm16(orgId: string, userId: string) {
    // Form 16 is typically generated at year-end
    return {
      data: {
        available: false,
        message: 'Form 16 will be available after year-end processing is completed by your employer.',
        downloadUrl: null,
      },
    };
  }
}
