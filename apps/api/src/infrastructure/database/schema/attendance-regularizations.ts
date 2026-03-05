import { pgTable, uuid, varchar, date, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const attendanceRegularizations = pgTable('attendance_regularizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  punchType: varchar('punch_type', { length: 20 }).notNull(),
  requestedTime: timestamp('requested_time', { withTimezone: true }).notNull(),
  reason: varchar('reason', { length: 500 }).notNull(),
  reasonCode: varchar('reason_code', { length: 50 }),
  evidence: jsonb('evidence').default([]),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewerComment: varchar('reviewer_comment', { length: 500 }),
  slaDeadline: timestamp('sla_deadline', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
