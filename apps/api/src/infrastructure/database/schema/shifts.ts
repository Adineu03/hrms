import { pgTable, uuid, varchar, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  type: varchar('type', { length: 50 }).notNull().default('general'),
  startTime: varchar('start_time', { length: 10 }).notNull(),
  endTime: varchar('end_time', { length: 10 }).notNull(),
  graceMinutesLate: integer('grace_minutes_late').notNull().default(15),
  graceMinutesEarly: integer('grace_minutes_early').notNull().default(15),
  isNightShift: boolean('is_night_shift').notNull().default(false),
  isFlexible: boolean('is_flexible').notNull().default(false),
  flexCoreStart: varchar('flex_core_start', { length: 10 }),
  flexCoreEnd: varchar('flex_core_end', { length: 10 }),
  minWorkHours: integer('min_work_hours').default(8),
  breakConfig: jsonb('break_config').default([]),
  rotationPattern: varchar('rotation_pattern', { length: 50 }),
  nightAllowance: jsonb('night_allowance').default({}),
  autoAssignRules: jsonb('auto_assign_rules').default({}),
  swapEnabled: boolean('swap_enabled').notNull().default(true),
  handoverRules: jsonb('handover_rules').default({}),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
