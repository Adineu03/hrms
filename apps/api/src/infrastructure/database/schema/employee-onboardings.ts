import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer, date, numeric } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { onboardingWorkflows } from './onboarding-workflows';

export const employeeOnboardings = pgTable('employee_onboardings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').references(() => onboardingWorkflows.id),
  status: varchar('status', { length: 30 }).notNull().default('not_started'),
  startDate: date('start_date'),
  targetCompletionDate: date('target_completion_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  progressPercentage: numeric('progress_percentage', { precision: 5, scale: 2 }).default('0'),
  buddyId: uuid('buddy_id').references(() => users.id),
  buddyFeedback: jsonb('buddy_feedback').default([]),
  orientationSchedule: jsonb('orientation_schedule').default([]),
  firstDayInfo: jsonb('first_day_info').default({}),
  probationEndDate: date('probation_end_date'),
  probationStatus: varchar('probation_status', { length: 30 }).default('pending'),
  probationReviews: jsonb('probation_reviews').default([]),
  checkinSchedule: jsonb('checkin_schedule').default([]),
  onboardingSurvey: jsonb('onboarding_survey').default({}),
  totalTasks: integer('total_tasks').default(0),
  completedTasks: integer('completed_tasks').default(0),
  initiatedBy: uuid('initiated_by').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
