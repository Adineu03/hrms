import { pgTable, uuid, varchar, date, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { shifts } from './shifts';

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  shiftId: uuid('shift_id').references(() => shifts.id),
  clockIn: timestamp('clock_in', { withTimezone: true }),
  clockOut: timestamp('clock_out', { withTimezone: true }),
  clockInMethod: varchar('clock_in_method', { length: 30 }),
  clockOutMethod: varchar('clock_out_method', { length: 30 }),
  clockInLocation: jsonb('clock_in_location').default({}),
  clockOutLocation: jsonb('clock_out_location').default({}),
  clockInIp: varchar('clock_in_ip', { length: 50 }),
  clockOutIp: varchar('clock_out_ip', { length: 50 }),
  clockInDeviceId: varchar('clock_in_device_id', { length: 100 }),
  clockOutDeviceId: varchar('clock_out_device_id', { length: 100 }),
  status: varchar('status', { length: 30 }).notNull().default('present'),
  lateMinutes: integer('late_minutes').default(0),
  earlyDepartureMinutes: integer('early_departure_minutes').default(0),
  totalWorkMinutes: integer('total_work_minutes').default(0),
  totalBreakMinutes: integer('total_break_minutes').default(0),
  overtimeMinutes: integer('overtime_minutes').default(0),
  isHalfDay: boolean('is_half_day').notNull().default(false),
  isOvertime: boolean('is_overtime').notNull().default(false),
  isRegularized: boolean('is_regularized').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(false),
  remarks: varchar('remarks', { length: 500 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
