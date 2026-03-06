import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyPayslipsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listPayslips(orgId: string, userId: string, year?: number) {
    const conditions = [
      eq(schema.paySlips.orgId, orgId),
      eq(schema.paySlips.employeeId, userId),
      eq(schema.paySlips.isActive, true),
    ];

    if (year) {
      conditions.push(eq(schema.paySlips.year, year));
    }

    const rows = await this.db
      .select()
      .from(schema.paySlips)
      .where(and(...conditions))
      .orderBy(desc(schema.paySlips.year), desc(schema.paySlips.month));

    return { data: rows, meta: { total: rows.length } };
  }

  async getPayslipDetail(orgId: string, userId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.paySlips)
      .where(
        and(
          eq(schema.paySlips.id, id),
          eq(schema.paySlips.orgId, orgId),
          eq(schema.paySlips.employeeId, userId),
          eq(schema.paySlips.isActive, true),
        ),
      );

    if (!rows.length) throw new NotFoundException('Payslip not found');

    return { data: rows[0] };
  }

  async downloadPayslip(orgId: string, userId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.paySlips)
      .where(
        and(
          eq(schema.paySlips.id, id),
          eq(schema.paySlips.orgId, orgId),
          eq(schema.paySlips.employeeId, userId),
          eq(schema.paySlips.isActive, true),
        ),
      );

    if (!rows.length) throw new NotFoundException('Payslip not found');

    // In a real implementation this would generate/return a PDF URL
    return {
      data: {
        payslipId: id,
        downloadUrl: rows[0].downloadUrl ?? `/api/v1/payroll-processing/employee/payslips/${id}/pdf`,
        format: 'pdf',
        month: rows[0].month,
        year: rows[0].year,
      },
    };
  }

  async getYtdSummary(orgId: string, userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();

    const payslips = await this.db
      .select()
      .from(schema.paySlips)
      .where(
        and(
          eq(schema.paySlips.orgId, orgId),
          eq(schema.paySlips.employeeId, userId),
          eq(schema.paySlips.year, currentYear),
          eq(schema.paySlips.isActive, true),
        ),
      )
      .orderBy(schema.paySlips.month);

    const totals = payslips.reduce(
      (acc, ps) => {
        acc.grossEarnings += parseFloat(ps.grossEarnings ?? '0');
        acc.basicSalary += parseFloat(ps.basicSalary ?? '0');
        acc.hra += parseFloat(ps.hra ?? '0');
        acc.da += parseFloat(ps.da ?? '0');
        acc.specialAllowance += parseFloat(ps.specialAllowance ?? '0');
        acc.otherEarnings += parseFloat(ps.otherEarnings ?? '0');
        acc.pfDeduction += parseFloat(ps.pfDeduction ?? '0');
        acc.esiDeduction += parseFloat(ps.esiDeduction ?? '0');
        acc.ptDeduction += parseFloat(ps.ptDeduction ?? '0');
        acc.incomeTax += parseFloat(ps.incomeTax ?? '0');
        acc.otherDeductions += parseFloat(ps.otherDeductions ?? '0');
        acc.totalDeductions += parseFloat(ps.totalDeductions ?? '0');
        acc.netPay += parseFloat(ps.netPay ?? '0');
        return acc;
      },
      {
        grossEarnings: 0,
        basicSalary: 0,
        hra: 0,
        da: 0,
        specialAllowance: 0,
        otherEarnings: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        ptDeduction: 0,
        incomeTax: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        netPay: 0,
      },
    );

    return {
      data: {
        year: currentYear,
        monthsProcessed: payslips.length,
        ytdEarnings: {
          grossEarnings: totals.grossEarnings.toFixed(2),
          basicSalary: totals.basicSalary.toFixed(2),
          hra: totals.hra.toFixed(2),
          da: totals.da.toFixed(2),
          specialAllowance: totals.specialAllowance.toFixed(2),
          otherEarnings: totals.otherEarnings.toFixed(2),
        },
        ytdDeductions: {
          pfDeduction: totals.pfDeduction.toFixed(2),
          esiDeduction: totals.esiDeduction.toFixed(2),
          ptDeduction: totals.ptDeduction.toFixed(2),
          incomeTax: totals.incomeTax.toFixed(2),
          otherDeductions: totals.otherDeductions.toFixed(2),
          totalDeductions: totals.totalDeductions.toFixed(2),
        },
        ytdNetPay: totals.netPay.toFixed(2),
      },
    };
  }

  async getPayslipComparison(orgId: string, userId: string) {
    // Get last 6 payslips for comparison
    const payslips = await this.db
      .select()
      .from(schema.paySlips)
      .where(
        and(
          eq(schema.paySlips.orgId, orgId),
          eq(schema.paySlips.employeeId, userId),
          eq(schema.paySlips.isActive, true),
        ),
      )
      .orderBy(desc(schema.paySlips.year), desc(schema.paySlips.month))
      .limit(6);

    const data = payslips.reverse().map((ps) => ({
      month: ps.month,
      year: ps.year,
      grossEarnings: ps.grossEarnings,
      totalDeductions: ps.totalDeductions,
      netPay: ps.netPay,
    }));

    return { data, meta: { total: data.length } };
  }
}
