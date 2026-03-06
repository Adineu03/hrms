import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, date } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const reviewCycles = pgTable('review_cycles', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull().default('annual'),
  reviewTypes: jsonb('review_types').default(['self', 'manager']),
  ratingScaleType: varchar('rating_scale_type', { length: 30 }).notNull().default('1-5'),
  ratingScaleConfig: jsonb('rating_scale_config').default({}),
  componentWeightage: jsonb('component_weightage').default({}),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  autoNotifications: boolean('auto_notifications').notNull().default(true),
  notificationConfig: jsonb('notification_config').default({}),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
