import { pgTable, uuid, varchar, date, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const holidayCalendars = pgTable('holiday_calendars', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  date: date('date').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('national'),
  isOptional: boolean('is_optional').notNull().default(false),
  isFloating: boolean('is_floating').notNull().default(false),
  applicableLocations: jsonb('applicable_locations').default([]),
  applicableDepartments: jsonb('applicable_departments').default([]),
  year: varchar('year', { length: 4 }).notNull(),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
