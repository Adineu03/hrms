import { pgTable, uuid, varchar, text, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { compliancePolicies } from './compliance-audit';

// policy_violations — manager-recorded policy violations with disciplinary action tracking
export const policyViolations = pgTable('policy_violations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  policyId: uuid('policy_id').references(() => compliancePolicies.id, { onDelete: 'set null' }),
  violationType: varchar('violation_type', { length: 100 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('minor'), // 'minor' | 'major' | 'gross'
  description: text('description'),
  incidentDate: date('incident_date'),
  status: varchar('status', { length: 30 }).notNull().default('open'), // 'open' | 'under_review' | 'action_taken' | 'closed'
  disciplinaryAction: text('disciplinary_action'),
  reportedBy: uuid('reported_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
