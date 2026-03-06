import { pgTable, uuid, varchar, integer, numeric, boolean, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { jobRequisitions } from './job-requisitions';

export const recruitmentPipelineStages = pgTable('recruitment_pipeline_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  requisitionId: uuid('requisition_id').references(() => jobRequisitions.id),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }),
  stageType: varchar('stage_type', { length: 30 }).notNull().default('interview'),
  sortOrder: integer('sort_order').notNull().default(0),
  evaluationCriteria: jsonb('evaluation_criteria').default([]),
  scorecardTemplate: jsonb('scorecard_template').default({}),
  autoAdvanceEnabled: boolean('auto_advance_enabled').notNull().default(false),
  autoAdvanceThreshold: numeric('auto_advance_threshold', { precision: 5, scale: 2 }),
  autoRejectEnabled: boolean('auto_reject_enabled').notNull().default(false),
  autoRejectThreshold: numeric('auto_reject_threshold', { precision: 5, scale: 2 }),
  rejectionTemplate: text('rejection_template'),
  slaDays: integer('sla_days').default(7),
  interviewerCount: integer('interviewer_count').default(1),
  isMandatory: boolean('is_mandatory').notNull().default(true),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
