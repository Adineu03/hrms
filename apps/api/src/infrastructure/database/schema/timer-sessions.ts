import { pgTable, uuid, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { projects } from './projects';
import { taskCategories } from './task-categories';

export const timerSessions = pgTable('timer_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id),
  taskCategoryId: uuid('task_category_id').references(() => taskCategories.id),
  description: varchar('description', { length: 1000 }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  totalPausedSeconds: varchar('total_paused_seconds', { length: 20 }).default('0'),
  isRunning: boolean('is_running').notNull().default(true),
  isPaused: boolean('is_paused').notNull().default(false),
  linkedEntryId: uuid('linked_entry_id'),
  isBillable: boolean('is_billable').notNull().default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
