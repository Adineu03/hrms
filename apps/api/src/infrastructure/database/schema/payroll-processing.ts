import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// payroll_runs — tracks each monthly payroll run
export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // draft|processing|review|approved|finalized|paid
  totalEmployees: integer('total_employees').notNull().default(0),
  totalGrossPay: numeric('total_gross_pay', { precision: 14, scale: 2 }).default('0'),
  totalDeductions: numeric('total_deductions', { precision: 14, scale: 2 }).default('0'),
  totalNetPay: numeric('total_net_pay', { precision: 14, scale: 2 }).default('0'),
  processedBy: uuid('processed_by'),
  approvedBy: uuid('approved_by'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  isLocked: boolean('is_locked').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// payroll_entries — individual employee payroll line items for a run
export const payrollEntries = pgTable('payroll_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
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
  overtimeAmount: numeric('overtime_amount', { precision: 14, scale: 2 }).default('0'),
  bonusAmount: numeric('bonus_amount', { precision: 14, scale: 2 }).default('0'),
  arrearsAmount: numeric('arrears_amount', { precision: 14, scale: 2 }).default('0'),
  reimbursementAmount: numeric('reimbursement_amount', { precision: 14, scale: 2 }).default('0'),
  lossOfPayDays: integer('loss_of_pay_days').notNull().default(0),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending|calculated|reviewed|approved
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// salary_components — configurable salary components for an org
export const salaryComponents = pgTable('salary_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(), // 'earning' | 'deduction'
  category: varchar('category', { length: 50 }).notNull(), // basic|hra|da|special_allowance|statutory|tax|other
  calculationType: varchar('calculation_type', { length: 30 }).notNull().default('fixed'), // fixed|percentage|formula
  calculationValue: numeric('calculation_value', { precision: 10, scale: 4 }),
  percentageOf: varchar('percentage_of', { length: 100 }),
  isStatutory: boolean('is_statutory').notNull().default(false),
  isTaxable: boolean('is_taxable').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// payroll_configs — org-level payroll configuration
export const payrollConfigs = pgTable('payroll_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  payrollCycleDay: integer('payroll_cycle_day').notNull().default(1),
  paymentDay: integer('payment_day').notNull().default(7),
  taxRegime: varchar('tax_regime', { length: 20 }).notNull().default('new'),
  pfEnabled: boolean('pf_enabled').notNull().default(true),
  pfEmployerRate: numeric('pf_employer_rate', { precision: 5, scale: 2 }).default('12.00'),
  pfEmployeeRate: numeric('pf_employee_rate', { precision: 5, scale: 2 }).default('12.00'),
  esiEnabled: boolean('esi_enabled').notNull().default(false),
  esiEmployerRate: numeric('esi_employer_rate', { precision: 5, scale: 2 }).default('3.25'),
  esiEmployeeRate: numeric('esi_employee_rate', { precision: 5, scale: 2 }).default('0.75'),
  ptEnabled: boolean('pt_enabled').notNull().default(true),
  lwfEnabled: boolean('lwf_enabled').notNull().default(false),
  autoProcessEnabled: boolean('auto_process_enabled').notNull().default(false),
  approvalRequired: boolean('approval_required').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// statutory_filings — PF/ESI/PT/TDS filing tracking
export const statutoryFilings = pgTable('statutory_filings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(), // pf|esi|pt|lwf|tds|form16|form24q
  period: varchar('period', { length: 20 }).notNull(), // YYYY-MM or YYYY
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending|filed|overdue|completed
  amount: numeric('amount', { precision: 14, scale: 2 }).default('0'),
  challanNumber: varchar('challan_number', { length: 100 }),
  filedAt: timestamp('filed_at', { withTimezone: true }),
  filedBy: uuid('filed_by'),
  remarks: text('remarks'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// tax_proofs — employee-submitted proofs for tax declarations
export const taxProofs = pgTable('tax_proofs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  declarationId: uuid('declaration_id').notNull(),
  section: varchar('section', { length: 30 }).notNull(), // 80C|80D|HRA|80E|80G|NPS
  description: varchar('description', { length: 500 }).notNull(),
  declaredAmount: numeric('declared_amount', { precision: 14, scale: 2 }).default('0'),
  proofAmount: numeric('proof_amount', { precision: 14, scale: 2 }).default('0'),
  documentUrl: varchar('document_url', { length: 500 }),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending|verified|rejected
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  remarks: text('remarks'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
