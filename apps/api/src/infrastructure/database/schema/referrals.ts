import { pgTable, uuid, varchar, numeric, boolean, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { jobPostings } from './job-postings';
import { candidates } from './candidates';

export const referrals = pgTable('referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  referrerId: uuid('referrer_id').notNull().references(() => users.id),
  jobPostingId: uuid('job_posting_id').notNull().references(() => jobPostings.id),
  candidateId: uuid('candidate_id').references(() => candidates.id),
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }).notNull(),
  candidatePhone: varchar('candidate_phone', { length: 30 }),
  candidateResume: varchar('candidate_resume', { length: 500 }),
  relationship: varchar('relationship', { length: 100 }),
  notes: text('notes'),
  status: varchar('status', { length: 30 }).notNull().default('submitted'),
  bonusAmount: numeric('bonus_amount', { precision: 10, scale: 2 }),
  bonusCurrency: varchar('bonus_currency', { length: 10 }).default('INR'),
  bonusStatus: varchar('bonus_status', { length: 30 }).default('not_eligible'),
  bonusPaidAt: timestamp('bonus_paid_at', { withTimezone: true }),
  applicationId: uuid('application_id'),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
