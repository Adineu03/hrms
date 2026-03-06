import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { courses } from './courses';

export const courseEnrollments = pgTable('course_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignmentType: varchar('assignment_type', { length: 20 }).notNull().default('self'),
  status: varchar('status', { length: 30 }).notNull().default('enrolled'),
  progress: integer('progress').notNull().default(0),
  score: integer('score'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  deadline: timestamp('deadline', { withTimezone: true }),
  certificateUrl: text('certificate_url'),
  quizResults: jsonb('quiz_results').default({}),
  timeSpent: integer('time_spent').default(0),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  rating: integer('rating'),
  review: text('review'),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
