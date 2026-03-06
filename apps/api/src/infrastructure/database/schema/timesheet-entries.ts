import { pgTable, uuid, varchar, date, numeric, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { projects } from './projects';
import { taskCategories } from './task-categories';

export const timesheetEntries = pgTable('timesheet_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  taskCategoryId: uuid('task_category_id').references(() => taskCategories.id),
  startTime: varchar('start_time', { length: 10 }),
  endTime: varchar('end_time', { length: 10 }),
  hours: numeric('hours', { precision: 5, scale: 2 }).notNull().default('0'),
  description: varchar('description', { length: 2000 }),
  isBillable: boolean('is_billable').notNull().default(false),
  tags: jsonb('tags').default([]),
  activityType: varchar('activity_type', { length: 50 }),
  submissionId: uuid('submission_id'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
