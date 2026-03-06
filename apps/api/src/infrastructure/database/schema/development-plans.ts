import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, numeric, date } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const developmentPlans = pgTable('development_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull().default('idp'),
  activities: jsonb('activities').default([]),
  skills: jsonb('skills').default([]),
  certifications: jsonb('certifications').default([]),
  careerAspiration: text('career_aspiration'),
  targetRole: varchar('target_role', { length: 255 }),
  gapAnalysis: jsonb('gap_analysis').default({}),
  mentorId: uuid('mentor_id').references(() => users.id),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  progress: numeric('progress', { precision: 5, scale: 2 }).default('0'),
  startDate: date('start_date'),
  targetDate: date('target_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  pipMilestones: jsonb('pip_milestones').default([]),
  pipOutcome: varchar('pip_outcome', { length: 30 }),
  escalationHistory: jsonb('escalation_history').default([]),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
