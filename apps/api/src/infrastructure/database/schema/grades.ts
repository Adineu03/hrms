import { pgTable, uuid, varchar, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  level: integer('level').notNull(),
  salaryBandMin: numeric('salary_band_min', { precision: 12, scale: 2 }),
  salaryBandMax: numeric('salary_band_max', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('INR'),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
