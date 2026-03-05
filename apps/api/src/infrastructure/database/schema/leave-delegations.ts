import { pgTable, uuid, varchar, date, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const leaveDelegations = pgTable('leave_delegations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  delegatorId: uuid('delegator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  delegateId: uuid('delegate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  delegationType: varchar('delegation_type', { length: 30 }).notNull().default('approval'),
  isActive: boolean('is_active').notNull().default(true),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  autoActivated: boolean('auto_activated').notNull().default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
