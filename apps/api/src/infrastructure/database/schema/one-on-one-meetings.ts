import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const oneOnOneMeetings = pgTable('one_on_one_meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  managerId: uuid('manager_id').notNull().references(() => users.id),
  employeeId: uuid('employee_id').notNull().references(() => users.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  duration: integer('duration').default(30),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrencePattern: varchar('recurrence_pattern', { length: 50 }),
  agenda: jsonb('agenda').default([]),
  notes: text('notes'),
  actionItems: jsonb('action_items').default([]),
  followUpReminder: timestamp('follow_up_reminder', { withTimezone: true }),
  status: varchar('status', { length: 30 }).notNull().default('scheduled'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  previousMeetingId: uuid('previous_meeting_id'),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
