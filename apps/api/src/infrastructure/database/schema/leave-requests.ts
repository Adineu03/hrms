import { pgTable, uuid, varchar, date, numeric, boolean, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { leaveTypes } from './leave-types';

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id),
  fromDate: date('from_date').notNull(),
  toDate: date('to_date').notNull(),
  totalDays: numeric('total_days', { precision: 5, scale: 1 }).notNull(),
  isHalfDay: boolean('is_half_day').notNull().default(false),
  halfDayType: varchar('half_day_type', { length: 20 }),
  reason: text('reason'),
  attachments: jsonb('attachments').default([]),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  approvalChain: jsonb('approval_chain').default([]),
  currentApproverLevel: integer('current_approver_level').default(1),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approverComment: text('approver_comment'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
  delegateId: uuid('delegate_id').references(() => users.id),
  dayBreakdown: jsonb('day_breakdown').default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
