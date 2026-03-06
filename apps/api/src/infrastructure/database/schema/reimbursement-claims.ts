import { pgTable, uuid, varchar, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const reimbursementClaims = pgTable('reimbursement_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'medical' | 'travel' | 'food' | 'telephone' | 'fuel' | 'other'
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  description: varchar('description', { length: 1000 }).notNull(),
  receiptUrl: varchar('receipt_url', { length: 500 }),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'paid'
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  remarks: varchar('remarks', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
