import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, date } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { employeeOnboardings } from './employee-onboardings';
import { onboardingWorkflowTasks } from './onboarding-workflow-tasks';

export const employeeOnboardingTasks = pgTable('employee_onboarding_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  onboardingId: uuid('onboarding_id').notNull().references(() => employeeOnboardings.id, { onDelete: 'cascade' }),
  workflowTaskId: uuid('workflow_task_id').references(() => onboardingWorkflowTasks.id),
  employeeId: uuid('employee_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  taskType: varchar('task_type', { length: 30 }).notNull().default('general'),
  taskOwner: varchar('task_owner', { length: 30 }).notNull().default('employee'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completedBy: uuid('completed_by').references(() => users.id),
  notes: text('notes'),
  attachments: jsonb('attachments').default([]),
  verificationStatus: varchar('verification_status', { length: 30 }),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
