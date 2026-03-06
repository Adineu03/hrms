import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer, date } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const certifications = pgTable('certifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  issuingBody: varchar('issuing_body', { length: 255 }),
  credentialId: varchar('credential_id', { length: 255 }),
  credentialUrl: text('credential_url'),
  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),
  renewalDate: date('renewal_date'),
  cpeCredits: integer('cpe_credits').default(0),
  cpeEarned: integer('cpe_earned').default(0),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  proofUrl: text('proof_url'),
  proofFileName: varchar('proof_file_name', { length: 255 }),
  alertSent30: boolean('alert_sent_30').notNull().default(false),
  alertSent60: boolean('alert_sent_60').notNull().default(false),
  alertSent90: boolean('alert_sent_90').notNull().default(false),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
