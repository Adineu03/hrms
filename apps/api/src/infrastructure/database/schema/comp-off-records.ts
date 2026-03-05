import { pgTable, uuid, varchar, date, numeric, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const compOffRecords = pgTable('comp_off_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  earnedDate: date('earned_date').notNull(),
  reason: text('reason').notNull(),
  workType: varchar('work_type', { length: 30 }).notNull(),
  daysEarned: numeric('days_earned', { precision: 4, scale: 1 }).notNull().default('1'),
  daysUsed: numeric('days_used', { precision: 4, scale: 1 }).notNull().default('0'),
  daysAvailable: numeric('days_available', { precision: 4, scale: 1 }).notNull().default('1'),
  expiryDate: date('expiry_date'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  linkedLeaveRequestId: uuid('linked_leave_request_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
