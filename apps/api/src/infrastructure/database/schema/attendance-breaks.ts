import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { attendanceRecords } from './attendance-records';

export const attendanceBreaks = pgTable('attendance_breaks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  attendanceRecordId: uuid('attendance_record_id').notNull().references(() => attendanceRecords.id, { onDelete: 'cascade' }),
  breakType: varchar('break_type', { length: 30 }).notNull().default('general'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  durationMinutes: integer('duration_minutes').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
