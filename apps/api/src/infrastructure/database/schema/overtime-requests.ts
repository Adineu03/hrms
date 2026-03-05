import { pgTable, uuid, varchar, date, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const overtimeRequests = pgTable('overtime_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  type: varchar('type', { length: 30 }).notNull().default('pre_approval'),
  estimatedHours: integer('estimated_hours'),
  actualHours: integer('actual_hours'),
  reason: varchar('reason', { length: 500 }),
  reasonCode: varchar('reason_code', { length: 50 }),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewerComment: varchar('reviewer_comment', { length: 500 }),
  overtimeRate: varchar('overtime_rate', { length: 10 }),
  compOffEligible: varchar('comp_off_eligible', { length: 10 }).default('no'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
