import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const learningPaths = pgTable('learning_paths', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull().default('role_based'),
  targetRole: varchar('target_role', { length: 100 }),
  skills: jsonb('skills').default([]),
  totalItems: integer('total_items').notNull().default(0),
  completedItems: integer('completed_items').notNull().default(0),
  progress: integer('progress').notNull().default(0),
  estimatedHours: integer('estimated_hours'),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  certificateUrl: text('certificate_url'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
