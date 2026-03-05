import { pgTable, uuid, varchar, boolean, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const setupStatusEnum = pgEnum('setup_status', ['not_started', 'in_progress', 'completed']);

export const orgModules = pgTable('org_modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  moduleId: varchar('module_id', { length: 50 }).notNull(),
  isActive: boolean('is_active').notNull().default(false),
  setupStatus: setupStatusEnum('setup_status').notNull().default('not_started'),
  setupProgress: jsonb('setup_progress').default({}),
  config: jsonb('config').default({}),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
