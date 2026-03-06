import { pgTable, uuid, varchar, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const taskCategories = pgTable('task_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 30 }),
  type: varchar('type', { length: 50 }).notNull().default('general'),
  isBillable: boolean('is_billable').notNull().default(false),
  color: varchar('color', { length: 7 }).default('#6B7280'),
  sortOrder: integer('sort_order').default(0),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
