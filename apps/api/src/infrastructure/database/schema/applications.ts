import { pgTable, uuid, varchar, numeric, boolean, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { candidates } from './candidates';
import { jobPostings } from './job-postings';
import { jobRequisitions } from './job-requisitions';

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  candidateId: uuid('candidate_id').notNull().references(() => candidates.id),
  jobPostingId: uuid('job_posting_id').notNull().references(() => jobPostings.id),
  requisitionId: uuid('requisition_id').notNull().references(() => jobRequisitions.id),
  source: varchar('source', { length: 50 }).default('direct'),
  referralId: uuid('referral_id'),
  coverLetter: text('cover_letter'),
  resumeUrl: varchar('resume_url', { length: 500 }),
  currentStageId: uuid('current_stage_id'),
  status: varchar('status', { length: 30 }).notNull().default('new'),
  overallScore: numeric('overall_score', { precision: 5, scale: 2 }),
  feedback: jsonb('feedback').default([]),
  rejectionReason: varchar('rejection_reason', { length: 500 }),
  rejectedBy: uuid('rejected_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  withdrawReason: text('withdraw_reason'),
  hiredAt: timestamp('hired_at', { withTimezone: true }),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  internalEmployeeId: uuid('internal_employee_id').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
