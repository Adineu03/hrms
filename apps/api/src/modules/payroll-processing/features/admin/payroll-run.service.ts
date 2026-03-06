import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PayrollRunService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listRuns(orgId: string, filters?: { month?: number; year?: number; status?: string }) {
    const conditions = [
      eq(schema.payrollRuns.orgId, orgId),
      eq(schema.payrollRuns.isActive, true),
    ];

    if (filters?.month) {
      conditions.push(eq(schema.payrollRuns.month, filters.month));
    }
    if (filters?.year) {
      conditions.push(eq(schema.payrollRuns.year, filters.year));
    }
    if (filters?.status) {
      conditions.push(eq(schema.payrollRuns.status, filters.status));
    }

    const rows = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(...conditions))
      .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month));

    return { data: rows, meta: { total: rows.length } };
  }

  async createRun(orgId: string, dto: { month: number; year: number }, createdBy?: string) {
    // Check if a run already exists for this month/year
    const existing = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(
        and(
          eq(schema.payrollRuns.orgId, orgId),
          eq(schema.payrollRuns.month, dto.month),
          eq(schema.payrollRuns.year, dto.year),
          eq(schema.payrollRuns.isActive, true),
        ),
      );

    if (existing.length) {
      throw new BadRequestException(`Payroll run already exists for ${dto.month}/${dto.year}`);
    }

    const [row] = await this.db
      .insert(schema.payrollRuns)
      .values({
        orgId,
        month: dto.month,
        year: dto.year,
        status: 'draft',
      })
      .returning();

    return { data: row };
  }

  async getRunDetail(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)));

    if (!rows.length) throw new NotFoundException('Payroll run not found');

    // Get entries for this run
    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(and(eq(schema.payrollEntries.payrollRunId, id), eq(schema.payrollEntries.orgId, orgId), eq(schema.payrollEntries.isActive, true)));

    return { data: { ...rows[0], entries } };
  }

  async processRun(orgId: string, id: string, processedBy?: string) {
    const run = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)));

    if (!run.length) throw new NotFoundException('Payroll run not found');
    if (run[0].status !== 'draft') {
      throw new BadRequestException('Only draft payroll runs can be processed');
    }

    // Get all employees with profiles
    const employees = await this.db
      .select({
        userId: schema.employeeProfiles.userId,
        departmentId: schema.employeeProfiles.departmentId,
      })
      .from(schema.employeeProfiles)
      .where(eq(schema.employeeProfiles.orgId, orgId));

    // Get salary assignments for these employees
    const salaryAssignments = await this.db
      .select()
      .from(schema.employeeSalaryAssignments)
      .where(eq(schema.employeeSalaryAssignments.orgId, orgId));

    const assignmentMap = new Map(
      salaryAssignments.map((sa) => [sa.employeeId, sa]),
    );

    // Generate payroll entries for each employee
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const entryValues = employees.map((emp) => {
      const assignment = assignmentMap.get(emp.userId);
      const basic = parseFloat(assignment?.basicSalary ?? '0');
      const hra = basic * 0.4;
      const da = basic * 0.1;
      const special = basic * 0.2;
      const gross = basic + hra + da + special;
      const pf = basic * 0.12;
      const esi = gross <= 21000 ? gross * 0.0075 : 0;
      const pt = 200;
      const tax = gross * 0.1; // simplified estimate
      const totalDed = pf + esi + pt + tax;
      const net = gross - totalDed;

      totalGross += gross;
      totalDeductions += totalDed;
      totalNet += net;

      return {
        orgId,
        payrollRunId: id,
        employeeId: emp.userId,
        basicSalary: basic.toFixed(2),
        hra: hra.toFixed(2),
        da: da.toFixed(2),
        specialAllowance: special.toFixed(2),
        otherEarnings: '0',
        grossEarnings: gross.toFixed(2),
        pfDeduction: pf.toFixed(2),
        esiDeduction: esi.toFixed(2),
        ptDeduction: pt.toFixed(2),
        incomeTax: tax.toFixed(2),
        otherDeductions: '0',
        totalDeductions: totalDed.toFixed(2),
        netPay: net.toFixed(2),
        status: 'calculated',
      };
    });

    if (entryValues.length) {
      await this.db.insert(schema.payrollEntries).values(entryValues);
    }

    // Update the run
    const [updatedRun] = await this.db
      .update(schema.payrollRuns)
      .set({
        status: 'processing',
        totalEmployees: employees.length,
        totalGrossPay: totalGross.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNetPay: totalNet.toFixed(2),
        processedBy: processedBy ?? null,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId)))
      .returning();

    return { data: updatedRun };
  }

  async approveRun(orgId: string, id: string, approvedBy?: string) {
    const run = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)));

    if (!run.length) throw new NotFoundException('Payroll run not found');
    if (run[0].status !== 'processing' && run[0].status !== 'review') {
      throw new BadRequestException('Payroll run is not in a state that can be approved');
    }

    const [row] = await this.db
      .update(schema.payrollRuns)
      .set({
        status: 'approved',
        approvedBy: approvedBy ?? null,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async finalizeRun(orgId: string, id: string, finalizedBy?: string) {
    const run = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)));

    if (!run.length) throw new NotFoundException('Payroll run not found');
    if (run[0].status !== 'approved') {
      throw new BadRequestException('Only approved payroll runs can be finalized');
    }

    // Generate pay slips for each entry
    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(and(eq(schema.payrollEntries.payrollRunId, id), eq(schema.payrollEntries.orgId, orgId), eq(schema.payrollEntries.isActive, true)));

    const paySlipValues = entries.map((entry) => ({
      orgId,
      employeeId: entry.employeeId,
      month: run[0].month,
      year: run[0].year,
      basicSalary: entry.basicSalary,
      hra: entry.hra,
      da: entry.da,
      specialAllowance: entry.specialAllowance,
      otherEarnings: entry.otherEarnings,
      grossEarnings: entry.grossEarnings,
      pfDeduction: entry.pfDeduction,
      esiDeduction: entry.esiDeduction,
      ptDeduction: entry.ptDeduction,
      incomeTax: entry.incomeTax,
      otherDeductions: entry.otherDeductions,
      totalDeductions: entry.totalDeductions,
      netPay: entry.netPay,
      status: 'generated',
      generatedAt: new Date(),
    }));

    if (paySlipValues.length) {
      await this.db.insert(schema.paySlips).values(paySlipValues);
    }

    const [row] = await this.db
      .update(schema.payrollRuns)
      .set({
        status: 'finalized',
        finalizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async lockRun(orgId: string, id: string) {
    const run = await this.db
      .select()
      .from(schema.payrollRuns)
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)));

    if (!run.length) throw new NotFoundException('Payroll run not found');

    const newLocked = !run[0].isLocked;

    const [row] = await this.db
      .update(schema.payrollRuns)
      .set({
        isLocked: newLocked,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.payrollRuns.id, id), eq(schema.payrollRuns.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async listEntries(orgId: string, runId: string) {
    const entries = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(and(eq(schema.payrollEntries.payrollRunId, runId), eq(schema.payrollEntries.orgId, orgId), eq(schema.payrollEntries.isActive, true)));

    return { data: entries, meta: { total: entries.length } };
  }

  async updateEntry(
    orgId: string,
    runId: string,
    entryId: string,
    dto: {
      otherEarnings?: string;
      otherDeductions?: string;
      overtimeAmount?: string;
      bonusAmount?: string;
      arrearsAmount?: string;
      reimbursementAmount?: string;
      lossOfPayDays?: number;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.payrollEntries)
      .where(
        and(
          eq(schema.payrollEntries.id, entryId),
          eq(schema.payrollEntries.payrollRunId, runId),
          eq(schema.payrollEntries.orgId, orgId),
          eq(schema.payrollEntries.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Payroll entry not found');

    // Recalculate totals if needed
    const entry = existing[0];
    const otherEarnings = dto.otherEarnings !== undefined ? parseFloat(dto.otherEarnings) : parseFloat(entry.otherEarnings ?? '0');
    const otherDeductions = dto.otherDeductions !== undefined ? parseFloat(dto.otherDeductions) : parseFloat(entry.otherDeductions ?? '0');
    const overtime = dto.overtimeAmount !== undefined ? parseFloat(dto.overtimeAmount) : parseFloat(entry.overtimeAmount ?? '0');
    const bonus = dto.bonusAmount !== undefined ? parseFloat(dto.bonusAmount) : parseFloat(entry.bonusAmount ?? '0');
    const arrears = dto.arrearsAmount !== undefined ? parseFloat(dto.arrearsAmount) : parseFloat(entry.arrearsAmount ?? '0');
    const reimbursement = dto.reimbursementAmount !== undefined ? parseFloat(dto.reimbursementAmount) : parseFloat(entry.reimbursementAmount ?? '0');

    const basicComponents =
      parseFloat(entry.basicSalary ?? '0') +
      parseFloat(entry.hra ?? '0') +
      parseFloat(entry.da ?? '0') +
      parseFloat(entry.specialAllowance ?? '0');

    const gross = basicComponents + otherEarnings + overtime + bonus + arrears + reimbursement;
    const statutoryDeductions =
      parseFloat(entry.pfDeduction ?? '0') +
      parseFloat(entry.esiDeduction ?? '0') +
      parseFloat(entry.ptDeduction ?? '0') +
      parseFloat(entry.incomeTax ?? '0');
    const totalDed = statutoryDeductions + otherDeductions;
    const net = gross - totalDed;

    const [row] = await this.db
      .update(schema.payrollEntries)
      .set({
        ...(dto.otherEarnings !== undefined && { otherEarnings: dto.otherEarnings }),
        ...(dto.otherDeductions !== undefined && { otherDeductions: dto.otherDeductions }),
        ...(dto.overtimeAmount !== undefined && { overtimeAmount: dto.overtimeAmount }),
        ...(dto.bonusAmount !== undefined && { bonusAmount: dto.bonusAmount }),
        ...(dto.arrearsAmount !== undefined && { arrearsAmount: dto.arrearsAmount }),
        ...(dto.reimbursementAmount !== undefined && { reimbursementAmount: dto.reimbursementAmount }),
        ...(dto.lossOfPayDays !== undefined && { lossOfPayDays: dto.lossOfPayDays }),
        grossEarnings: gross.toFixed(2),
        totalDeductions: totalDed.toFixed(2),
        netPay: net.toFixed(2),
        status: 'adjusted',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.payrollEntries.id, entryId),
          eq(schema.payrollEntries.orgId, orgId),
        ),
      )
      .returning();

    return { data: row };
  }
}
