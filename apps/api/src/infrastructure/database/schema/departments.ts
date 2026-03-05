import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: uuid('parent_id'),
  headId: uuid('head_id'),
  locationId: uuid('location_id'),
  workModel: varchar('work_model', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
