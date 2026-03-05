import { pgTable, uuid, varchar, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const leaveApprovalWorkflows = pgTable('leave_approval_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  levels: jsonb('levels').notNull().default([]),
  applicableLeaveTypes: jsonb('applicable_leave_types').default([]),
  applicableDepartments: jsonb('applicable_departments').default([]),
  minDaysForMultiLevel: integer('min_days_for_multi_level').default(3),
  isDefault: boolean('is_default').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
