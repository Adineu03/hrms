import { pgTable, uuid, varchar, date, numeric, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const timesheetSubmissions = pgTable('timesheet_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  totalHours: numeric('total_hours', { precision: 6, scale: 2 }).notNull().default('0'),
  billableHours: numeric('billable_hours', { precision: 6, scale: 2 }).default('0'),
  nonBillableHours: numeric('non_billable_hours', { precision: 6, scale: 2 }).default('0'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  summaryNote: varchar('summary_note', { length: 2000 }),
  approvalChain: jsonb('approval_chain').default([]),
  currentApproverLevel: integer('current_approver_level').default(1),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approverComment: varchar('approver_comment', { length: 1000 }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: varchar('rejection_reason', { length: 1000 }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lockedBy: uuid('locked_by').references(() => users.id),
  dayBreakdown: jsonb('day_breakdown').default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
