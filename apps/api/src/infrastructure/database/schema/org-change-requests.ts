import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const orgChangeRequests = pgTable('org_change_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').notNull(), // manager who initiated
  type: varchar('type', { length: 50 }).notNull(), // 'promotion' | 'transfer' | 'salary_change' | 'role_change' | 'reporting_change'
  employeeId: uuid('employee_id').notNull(), // affected employee
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'implemented'
  currentData: jsonb('current_data').default({}), // snapshot of current state
  proposedData: jsonb('proposed_data').default({}), // proposed changes
  justification: text('justification'),
  budgetImpact: varchar('budget_impact', { length: 255 }),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  implementedAt: timestamp('implemented_at', { withTimezone: true }),
  effectiveDate: timestamp('effective_date', { withTimezone: true }),
  generatedLetterUrl: varchar('generated_letter_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
