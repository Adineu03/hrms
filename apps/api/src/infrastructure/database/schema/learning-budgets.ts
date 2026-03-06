import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, numeric } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { departments } from './departments';

export const learningBudgets = pgTable('learning_budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull().default('department'),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  employeeId: uuid('employee_id').references(() => users.id, { onDelete: 'set null' }),
  fiscalYear: varchar('fiscal_year', { length: 10 }).notNull(),
  totalBudget: numeric('total_budget', { precision: 12, scale: 2 }).notNull().default('0'),
  allocatedAmount: numeric('allocated_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  spentAmount: numeric('spent_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  remainingAmount: numeric('remaining_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  rolloverEnabled: boolean('rollover_enabled').notNull().default(false),
  rolloverAmount: numeric('rollover_amount', { precision: 12, scale: 2 }).default('0'),
  spendHistory: jsonb('spend_history').default([]),
  approvalConfig: jsonb('approval_config').default({}),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
