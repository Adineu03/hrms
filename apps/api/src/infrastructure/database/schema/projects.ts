import { pgTable, uuid, varchar, integer, numeric, boolean, date, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  clientName: varchar('client_name', { length: 255 }),
  description: varchar('description', { length: 1000 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  budgetHours: numeric('budget_hours', { precision: 8, scale: 1 }),
  isBillable: boolean('is_billable').notNull().default(true),
  billableRate: numeric('billable_rate', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('USD'),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  color: varchar('color', { length: 7 }).default('#4F46E5'),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
