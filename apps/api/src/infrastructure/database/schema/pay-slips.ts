import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const paySlips = pgTable('pay_slips', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  basicSalary: numeric('basic_salary', { precision: 14, scale: 2 }).default('0'),
  hra: numeric('hra', { precision: 14, scale: 2 }).default('0'),
  da: numeric('da', { precision: 14, scale: 2 }).default('0'),
  specialAllowance: numeric('special_allowance', { precision: 14, scale: 2 }).default('0'),
  otherEarnings: numeric('other_earnings', { precision: 14, scale: 2 }).default('0'),
  grossEarnings: numeric('gross_earnings', { precision: 14, scale: 2 }).default('0'),
  pfDeduction: numeric('pf_deduction', { precision: 14, scale: 2 }).default('0'),
  esiDeduction: numeric('esi_deduction', { precision: 14, scale: 2 }).default('0'),
  ptDeduction: numeric('pt_deduction', { precision: 14, scale: 2 }).default('0'),
  incomeTax: numeric('income_tax', { precision: 14, scale: 2 }).default('0'),
  otherDeductions: numeric('other_deductions', { precision: 14, scale: 2 }).default('0'),
  totalDeductions: numeric('total_deductions', { precision: 14, scale: 2 }).default('0'),
  netPay: numeric('net_pay', { precision: 14, scale: 2 }).default('0'),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'generated' | 'published' | 'paid'
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  downloadUrl: varchar('download_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
