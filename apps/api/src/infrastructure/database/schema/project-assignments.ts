import { pgTable, uuid, varchar, numeric, boolean, date, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { projects } from './projects';

export const projectAssignments = pgTable('project_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }),
  allocationPercentage: numeric('allocation_percentage', { precision: 5, scale: 1 }).default('100'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isBillable: boolean('is_billable').default(true),
  billableRate: numeric('billable_rate', { precision: 10, scale: 2 }),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
