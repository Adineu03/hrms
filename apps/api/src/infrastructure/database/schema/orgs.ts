import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  industry: varchar('industry', { length: 100 }),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
