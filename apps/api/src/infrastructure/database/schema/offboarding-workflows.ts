import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { departments } from './departments';

export const offboardingWorkflows = pgTable('offboarding_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  exitType: varchar('exit_type', { length: 30 }).notNull().default('resignation'),
  departmentId: uuid('department_id').references(() => departments.id),
  designationId: uuid('designation_id'),
  clearanceDepartments: jsonb('clearance_departments').default([]),
  assetChecklist: jsonb('asset_checklist').default([]),
  settlementChecklist: jsonb('settlement_checklist').default([]),
  isTemplate: boolean('is_template').notNull().default(true),
  taskCount: integer('task_count').notNull().default(0),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
