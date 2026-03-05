import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const designations = pgTable('designations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  level: integer('level').notNull().default(1),
  departmentId: uuid('department_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
