import { pgTable, uuid, varchar, numeric, boolean, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const compensationRevisions = pgTable('compensation_revisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('annual'), // 'annual' | 'mid_year' | 'promotion' | 'market_adjustment'
  fiscalYear: varchar('fiscal_year', { length: 20 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'in_progress' | 'pending_approval' | 'approved' | 'completed'
  effectiveDate: timestamp('effective_date', { withTimezone: true }),
  totalBudget: numeric('total_budget', { precision: 14, scale: 2 }).default('0'),
  allocatedBudget: numeric('allocated_budget', { precision: 14, scale: 2 }).default('0'),
  spentBudget: numeric('spent_budget', { precision: 14, scale: 2 }).default('0'),
  meritMatrix: jsonb('merit_matrix').default({}), // { performanceRating: { min, max }, incrementRange: { min, max } }
  approvalWorkflow: jsonb('approval_workflow').default({}),
  departments: jsonb('departments').default([]),
  grades: jsonb('grades').default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const compensationRevisionItems = pgTable('compensation_revision_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').notNull().references(() => compensationRevisions.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  currentCtc: numeric('current_ctc', { precision: 14, scale: 2 }).default('0'),
  proposedCtc: numeric('proposed_ctc', { precision: 14, scale: 2 }).default('0'),
  incrementPercent: numeric('increment_percent', { precision: 6, scale: 2 }).default('0'),
  incrementAmount: numeric('increment_amount', { precision: 14, scale: 2 }).default('0'),
  meritScore: integer('merit_score'),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'proposed' | 'approved' | 'rejected'
  proposedBy: uuid('proposed_by'),
  approvedBy: uuid('approved_by'),
  remarks: varchar('remarks', { length: 1000 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
