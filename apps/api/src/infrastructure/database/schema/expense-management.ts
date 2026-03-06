import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// expense_categories — configurable expense categories per org
export const expenseCategories = pgTable('expense_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// expense_policies — expense rules per org (spending limits, receipt rules, per diem rates)
export const expensePolicies = pgTable('expense_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  categoryId: uuid('category_id').references(() => expenseCategories.id, { onDelete: 'set null' }),
  maxAmountPerClaim: numeric('max_amount_per_claim', { precision: 14, scale: 2 }),
  maxAmountPerMonth: numeric('max_amount_per_month', { precision: 14, scale: 2 }),
  requiresReceipt: boolean('requires_receipt').notNull().default(true),
  receiptMinAmount: numeric('receipt_min_amount', { precision: 14, scale: 2 }).default('0'),
  perDiemRate: numeric('per_diem_rate', { precision: 14, scale: 2 }),
  appliesToRole: varchar('applies_to_role', { length: 50 }), // null = all roles
  appliesToGrade: varchar('applies_to_grade', { length: 100 }),
  appliesToDepartment: uuid('applies_to_department'),
  approvalLevels: integer('approval_levels').notNull().default(1),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// expense_reports — full expense reports submitted by employees
export const expenseReports = pgTable('expense_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // draft|submitted|under_review|approved|rejected|reimbursed
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  reimbursedAt: timestamp('reimbursed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// expense_items — individual line items within an expense report
export const expenseItems = pgTable('expense_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  reportId: uuid('report_id').notNull().references(() => expenseReports.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => expenseCategories.id, { onDelete: 'set null' }),
  date: timestamp('date', { withTimezone: true }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  vendor: varchar('vendor', { length: 255 }),
  description: varchar('description', { length: 500 }).notNull(),
  receiptUrl: varchar('receipt_url', { length: 500 }),
  receiptName: varchar('receipt_name', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// expense_approvals — approval actions on expense reports
export const expenseApprovals = pgTable('expense_approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  reportId: uuid('report_id').notNull().references(() => expenseReports.id, { onDelete: 'cascade' }),
  approverId: uuid('approver_id').notNull(),
  action: varchar('action', { length: 30 }).notNull(), // approved|rejected|returned|commented
  comments: text('comments'),
  level: integer('level').notNull().default(1),
  actionAt: timestamp('action_at', { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
