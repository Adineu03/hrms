import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const selfServiceRequests = pgTable('self_service_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'employment_verification' | 'noc' | 'experience_letter' | 'salary_certificate' | 'name_change' | 'bank_change' | 'address_change'
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed'
  priority: varchar('priority', { length: 20 }).notNull().default('normal'),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  data: jsonb('data').default({}), // request-specific data (e.g., new bank details, new address)
  attachments: jsonb('attachments').default([]), // file URLs
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),
  generatedDocUrl: varchar('generated_doc_url', { length: 500 }),
  slaDeadline: timestamp('sla_deadline', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
