import { pgTable, uuid, varchar, integer, boolean, date, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { jobRequisitions } from './job-requisitions';

export const jobPostings = pgTable('job_postings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  requisitionId: uuid('requisition_id').notNull().references(() => jobRequisitions.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  responsibilities: text('responsibilities'),
  benefits: text('benefits'),
  skills: jsonb('skills').default([]),
  experience: jsonb('experience').default({}),
  qualifications: jsonb('qualifications').default([]),
  postingType: varchar('posting_type', { length: 20 }).notNull().default('external'),
  channels: jsonb('channels').default([]),
  locationDetails: jsonb('location_details').default({}),
  salaryVisible: boolean('salary_visible').notNull().default(false),
  salaryDisplay: varchar('salary_display', { length: 255 }),
  applicationDeadline: date('application_deadline'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  viewCount: integer('view_count').default(0),
  applicationCount: integer('application_count').default(0),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
