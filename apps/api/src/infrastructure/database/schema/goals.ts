import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, numeric, date } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => users.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 30 }).notNull().default('individual'),
  framework: varchar('framework', { length: 30 }).notNull().default('okr'),
  parentGoalId: uuid('parent_goal_id'),
  alignedOrgGoalId: uuid('aligned_org_goal_id'),
  measurementCriteria: text('measurement_criteria'),
  successMetrics: jsonb('success_metrics').default([]),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }).default('0'),
  unit: varchar('unit', { length: 50 }),
  weightage: numeric('weightage', { precision: 5, scale: 2 }).default('100'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  progress: numeric('progress', { precision: 5, scale: 2 }).default('0'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  isTemplate: boolean('is_template').notNull().default(false),
  templateRole: varchar('template_role', { length: 100 }),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
