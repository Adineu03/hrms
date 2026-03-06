import { pgTable, uuid, varchar, integer, numeric, boolean, date, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { applications } from './applications';
import { candidates } from './candidates';
import { jobRequisitions } from './job-requisitions';

export const offerLetters = pgTable('offer_letters', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  candidateId: uuid('candidate_id').notNull().references(() => candidates.id),
  requisitionId: uuid('requisition_id').notNull().references(() => jobRequisitions.id),
  designation: varchar('designation', { length: 255 }).notNull(),
  department: varchar('department', { length: 255 }),
  location: varchar('location', { length: 255 }),
  employmentType: varchar('employment_type', { length: 30 }).default('full_time'),
  salaryAmount: numeric('salary_amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('INR'),
  salaryBreakdown: jsonb('salary_breakdown').default({}),
  joiningDate: date('joining_date'),
  probationMonths: integer('probation_months').default(6),
  reportingTo: varchar('reporting_to', { length: 255 }),
  terms: text('terms'),
  benefits: jsonb('benefits').default([]),
  templateId: varchar('template_id', { length: 100 }),
  approvalChain: jsonb('approval_chain').default([]),
  currentApproverLevel: integer('current_approver_level').default(1),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  negotiationHistory: jsonb('negotiation_history').default([]),
  validUntil: date('valid_until'),
  documentUrl: varchar('document_url', { length: 500 }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
