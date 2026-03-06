import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull().default('internal'),
  format: varchar('format', { length: 30 }).notNull().default('video'),
  provider: varchar('provider', { length: 100 }),
  externalUrl: text('external_url'),
  duration: integer('duration'),
  difficulty: varchar('difficulty', { length: 20 }).notNull().default('beginner'),
  skills: jsonb('skills').default([]),
  topics: jsonb('topics').default([]),
  thumbnailUrl: text('thumbnail_url'),
  scormEnabled: boolean('scorm_enabled').notNull().default(false),
  xapiEnabled: boolean('xapi_enabled').notNull().default(false),
  contentConfig: jsonb('content_config').default({}),
  quizConfig: jsonb('quiz_config').default({}),
  isMandatory: boolean('is_mandatory').notNull().default(false),
  complianceCategory: varchar('compliance_category', { length: 100 }),
  avgRating: integer('avg_rating').default(0),
  totalEnrollments: integer('total_enrollments').default(0),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
