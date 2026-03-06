import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer, date } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { offboardingWorkflows } from './offboarding-workflows';

export const employeeOffboardings = pgTable('employee_offboardings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').references(() => offboardingWorkflows.id),
  exitType: varchar('exit_type', { length: 30 }).notNull().default('resignation'),
  exitReason: text('exit_reason'),
  resignationDate: date('resignation_date'),
  lastWorkingDate: date('last_working_date'),
  noticePeriodDays: integer('notice_period_days'),
  clearanceStatus: jsonb('clearance_status').default({}),
  assetReturnStatus: jsonb('asset_return_status').default([]),
  settlementStatus: varchar('settlement_status', { length: 30 }).default('pending'),
  settlementEstimate: jsonb('settlement_estimate').default({}),
  handoverStatus: varchar('handover_status', { length: 30 }).default('pending'),
  exitSurveyResponses: jsonb('exit_survey_responses').default({}),
  rehireEligible: boolean('rehire_eligible'),
  rehireNotes: text('rehire_notes'),
  relievingLetterUrl: varchar('relieving_letter_url', { length: 500 }),
  experienceLetterUrl: varchar('experience_letter_url', { length: 500 }),
  status: varchar('status', { length: 30 }).notNull().default('initiated'),
  initiatedBy: uuid('initiated_by').references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
