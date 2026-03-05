import { pgTable, uuid, varchar, date, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { shifts } from './shifts';

export const shiftSwapRequests = pgTable('shift_swap_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetEmployeeId: uuid('target_employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requesterShiftId: uuid('requester_shift_id').notNull().references(() => shifts.id),
  targetShiftId: uuid('target_shift_id').notNull().references(() => shifts.id),
  swapDate: date('swap_date').notNull(),
  reason: varchar('reason', { length: 500 }),
  status: varchar('status', { length: 30 }).notNull().default('pending_partner'),
  partnerAcceptedAt: timestamp('partner_accepted_at', { withTimezone: true }),
  managerApprovedBy: uuid('manager_approved_by'),
  managerApprovedAt: timestamp('manager_approved_at', { withTimezone: true }),
  managerComment: varchar('manager_comment', { length: 500 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
