import { pgTable, uuid, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { leaveTypes } from './leave-types';

export const leaveBalances = pgTable('leave_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id, { onDelete: 'cascade' }),
  year: varchar('year', { length: 4 }).notNull(),
  entitled: numeric('entitled', { precision: 6, scale: 1 }).notNull().default('0'),
  accrued: numeric('accrued', { precision: 6, scale: 1 }).notNull().default('0'),
  used: numeric('used', { precision: 6, scale: 1 }).notNull().default('0'),
  pending: numeric('pending', { precision: 6, scale: 1 }).notNull().default('0'),
  carriedForward: numeric('carried_forward', { precision: 6, scale: 1 }).notNull().default('0'),
  adjusted: numeric('adjusted', { precision: 6, scale: 1 }).notNull().default('0'),
  available: numeric('available', { precision: 6, scale: 1 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
