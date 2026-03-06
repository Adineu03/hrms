import { pgTable, uuid, varchar, numeric, boolean, jsonb, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const surveys = pgTable('surveys', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('engagement'), // 'engagement' | 'pulse' | 'feedback' | 'anonymous'
  description: text('description'),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'scheduled' | 'active' | 'closed' | 'archived'
  questions: jsonb('questions').default([]),
  targetAudience: jsonb('target_audience').default({}), // { departments: [], roles: [], all: true }
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  closesAt: timestamp('closes_at', { withTimezone: true }),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  responseCount: integer('response_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const surveyResponses = pgTable('survey_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  surveyId: uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  respondentId: uuid('respondent_id'), // null for anonymous
  answers: jsonb('answers').default([]),
  sentiment: varchar('sentiment', { length: 30 }), // 'positive' | 'neutral' | 'negative'
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cultureValues = pgTable('culture_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  sortOrder: integer('sort_order').notNull().default(0),
  recognitionCount: integer('recognition_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const wellnessPrograms = pgTable('wellness_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('general'), // 'mental_health' | 'fitness' | 'nutrition' | 'financial' | 'general'
  description: text('description'),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'active' | 'completed' | 'archived'
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  budget: numeric('budget', { precision: 14, scale: 2 }).default('0'),
  spentBudget: numeric('spent_budget', { precision: 14, scale: 2 }).default('0'),
  maxParticipants: integer('max_participants'),
  currentParticipants: integer('current_participants').notNull().default(0),
  resources: jsonb('resources').default([]),
  schedule: jsonb('schedule').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const wellnessParticipations = pgTable('wellness_participations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => wellnessPrograms.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('enrolled'), // 'enrolled' | 'active' | 'completed' | 'dropped'
  progress: integer('progress').notNull().default(0), // 0-100
  pointsEarned: integer('points_earned').notNull().default(0),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const socialPosts = pgTable('social_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('post'), // 'post' | 'shoutout' | 'event' | 'announcement'
  content: text('content').notNull(),
  mediaUrls: jsonb('media_urls').default([]),
  groupId: uuid('group_id'),
  likesCount: integer('likes_count').notNull().default(0),
  commentsCount: integer('comments_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const socialGroups = pgTable('social_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull().default('interest'), // 'interest' | 'department' | 'project' | 'custom'
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  memberCount: integer('member_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const engagementScores = pgTable('engagement_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  overallScore: integer('overall_score').notNull().default(0), // 0-100
  enpsScore: integer('enps_score'),
  cultureFitScore: integer('culture_fit_score'),
  participationScore: integer('participation_score'),
  period: varchar('period', { length: 30 }).notNull(), // e.g. '2026-Q1'
  breakdown: jsonb('breakdown').default({}),
  badges: jsonb('badges').default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
