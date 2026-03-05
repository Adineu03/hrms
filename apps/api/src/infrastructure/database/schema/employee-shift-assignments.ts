import { pgTable, uuid, varchar, date, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { shifts } from './shifts';

export const employeeShiftAssignments = pgTable('employee_shift_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  assignedBy: uuid('assigned_by'),
  rotationGroupId: varchar('rotation_group_id', { length: 100 }),
  isCurrent: boolean('is_current').notNull().default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
