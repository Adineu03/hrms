import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { departments } from './departments';
import { designations } from './designations';

export const onboardingWorkflows = pgTable('onboarding_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  workflowType: varchar('workflow_type', { length: 30 }).notNull().default('onboarding'),
  departmentId: uuid('department_id').references(() => departments.id),
  designationId: uuid('designation_id').references(() => designations.id),
  locationId: uuid('location_id'),
  employmentType: varchar('employment_type', { length: 30 }),
  gradeId: uuid('grade_id'),
  isTemplate: boolean('is_template').notNull().default(true),
  taskCount: integer('task_count').notNull().default(0),
  conditionalRules: jsonb('conditional_rules').default([]),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
