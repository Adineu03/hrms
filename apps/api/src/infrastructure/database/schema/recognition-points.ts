import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const recognitionPoints = pgTable('recognition_points', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  totalEarned: integer('total_earned').notNull().default(0),
  totalRedeemed: integer('total_redeemed').notNull().default(0),
  balance: integer('balance').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const recognitionPointTransactions = pgTable('recognition_point_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  pointsAccountId: uuid('points_account_id').notNull().references(() => recognitionPoints.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(), // 'earned' | 'redeemed' | 'expired' | 'adjusted'
  points: integer('points').notNull(),
  reason: varchar('reason', { length: 500 }).notNull(),
  nominationId: uuid('nomination_id'),
  redeemedItem: varchar('redeemed_item', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
