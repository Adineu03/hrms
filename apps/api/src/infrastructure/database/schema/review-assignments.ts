import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, numeric } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { reviewCycles } from './review-cycles';

export const reviewAssignments = pgTable('review_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  cycleId: uuid('cycle_id').notNull().references(() => reviewCycles.id),
  employeeId: uuid('employee_id').notNull().references(() => users.id),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  reviewerType: varchar('reviewer_type', { length: 30 }).notNull().default('manager'),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  selfRating: numeric('self_rating', { precision: 4, scale: 2 }),
  managerRating: numeric('manager_rating', { precision: 4, scale: 2 }),
  finalRating: numeric('final_rating', { precision: 4, scale: 2 }),
  selfComments: text('self_comments'),
  managerComments: text('manager_comments'),
  peerFeedbackSummary: text('peer_feedback_summary'),
  achievements: jsonb('achievements').default([]),
  improvementAreas: jsonb('improvement_areas').default([]),
  goalData: jsonb('goal_data').default({}),
  competencyRatings: jsonb('competency_ratings').default({}),
  calibratedRating: numeric('calibrated_rating', { precision: 4, scale: 2 }),
  calibrationNotes: text('calibration_notes'),
  calibrationGroupId: varchar('calibration_group_id', { length: 100 }),
  preCalibratedRating: numeric('pre_calibrated_rating', { precision: 4, scale: 2 }),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  appealReason: text('appeal_reason'),
  appealStatus: varchar('appeal_status', { length: 30 }),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
