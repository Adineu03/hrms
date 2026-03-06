import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { onboardingWorkflows } from './onboarding-workflows';

export const onboardingWorkflowTasks = pgTable('onboarding_workflow_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => onboardingWorkflows.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  taskType: varchar('task_type', { length: 30 }).notNull().default('general'),
  taskOwner: varchar('task_owner', { length: 30 }).notNull().default('hr'),
  sortOrder: integer('sort_order').notNull().default(0),
  deadlineDays: integer('deadline_days').default(7),
  isMandatory: boolean('is_mandatory').notNull().default(true),
  isConditional: boolean('is_conditional').notNull().default(false),
  conditionRules: jsonb('condition_rules').default({}),
  documentRequired: boolean('document_required').notNull().default(false),
  documentType: varchar('document_type', { length: 100 }),
  trainingModuleId: varchar('training_module_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
