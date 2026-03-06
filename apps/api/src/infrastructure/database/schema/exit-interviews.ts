import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { employeeOffboardings } from './employee-offboardings';

export const exitInterviews = pgTable('exit_interviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id),
  offboardingId: uuid('offboarding_id').references(() => employeeOffboardings.id),
  interviewerId: uuid('interviewer_id').references(() => users.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  questionnaire: jsonb('questionnaire').default([]),
  responses: jsonb('responses').default({}),
  themes: jsonb('themes').default([]),
  sentiment: varchar('sentiment', { length: 30 }),
  overallRating: varchar('overall_rating', { length: 30 }),
  rehireEligible: boolean('rehire_eligible'),
  rehireNotes: text('rehire_notes'),
  exitReasons: jsonb('exit_reasons').default([]),
  improvements: text('improvements'),
  notes: text('notes'),
  status: varchar('status', { length: 30 }).notNull().default('scheduled'),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
