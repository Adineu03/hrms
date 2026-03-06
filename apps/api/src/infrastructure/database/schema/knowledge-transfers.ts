import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, date } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { employeeOffboardings } from './employee-offboardings';

export const knowledgeTransfers = pgTable('knowledge_transfers', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id),
  offboardingId: uuid('offboarding_id').references(() => employeeOffboardings.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  items: jsonb('items').default([]),
  documentLinks: jsonb('document_links').default([]),
  handoverDocument: jsonb('handover_document').default({}),
  pendingItems: jsonb('pending_items').default([]),
  accessCredentials: jsonb('access_credentials').default([]),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
