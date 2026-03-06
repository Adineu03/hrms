import { pgTable, uuid, text, boolean, jsonb, timestamp, numeric, varchar } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { goals } from './goals';

export const goalUpdates = pgTable('goal_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  goalId: uuid('goal_id').notNull().references(() => goals.id),
  employeeId: uuid('employee_id').notNull().references(() => users.id),
  previousProgress: numeric('previous_progress', { precision: 5, scale: 2 }),
  newProgress: numeric('new_progress', { precision: 5, scale: 2 }),
  comment: text('comment'),
  evidence: jsonb('evidence').default([]),
  milestoneTitle: varchar('milestone_title', { length: 255 }),
  milestoneCompleted: boolean('milestone_completed').default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
