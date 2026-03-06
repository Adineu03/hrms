import { pgTable, uuid, varchar, integer, numeric, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { applications } from './applications';
import { recruitmentPipelineStages } from './recruitment-pipeline-stages';
import { candidates } from './candidates';

export const interviews = pgTable('interviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  stageId: uuid('stage_id').notNull().references(() => recruitmentPipelineStages.id),
  candidateId: uuid('candidate_id').notNull().references(() => candidates.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  duration: integer('duration').default(60),
  location: varchar('location', { length: 500 }),
  interviewType: varchar('interview_type', { length: 30 }).notNull().default('video'),
  panelMembers: jsonb('panel_members').default([]),
  status: varchar('status', { length: 30 }).notNull().default('scheduled'),
  feedback: jsonb('feedback').default({}),
  overallScore: numeric('overall_score', { precision: 5, scale: 2 }),
  decision: varchar('decision', { length: 30 }),
  decisionBy: uuid('decision_by').references(() => users.id),
  decisionAt: timestamp('decision_at', { withTimezone: true }),
  notes: text('notes'),
  rescheduleCount: integer('reschedule_count').default(0),
  cancelReason: varchar('cancel_reason', { length: 500 }),
  calendarEventId: varchar('calendar_event_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
