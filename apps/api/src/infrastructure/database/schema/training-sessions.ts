import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { courses } from './courses';

export const trainingSessions = pgTable('training_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull().default('ilt'),
  instructorId: uuid('instructor_id').references(() => users.id),
  instructorName: varchar('instructor_name', { length: 255 }),
  location: varchar('location', { length: 255 }),
  roomName: varchar('room_name', { length: 100 }),
  virtualLink: text('virtual_link'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  maxCapacity: integer('max_capacity').default(30),
  enrolledCount: integer('enrolled_count').default(0),
  waitlistCount: integer('waitlist_count').default(0),
  autoEnrollWaitlist: boolean('auto_enroll_waitlist').notNull().default(true),
  attendees: jsonb('attendees').default([]),
  waitlist: jsonb('waitlist').default([]),
  attendanceRecords: jsonb('attendance_records').default({}),
  status: varchar('status', { length: 30 }).notNull().default('scheduled'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
