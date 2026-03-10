import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// demo_orgs — tracks demo sandbox organizations
export const demoOrgs = pgTable('demo_orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  sandboxName: varchar('sandbox_name', { length: 255 }).notNull(),
  industryTemplate: varchar('industry_template', { length: 100 }).notNull().default('it-services'), // 'it-services'|'manufacturing'|'healthcare'|'retail'
  employeeCount: integer('employee_count').notNull().default(10), // 10|25|50
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active'|'resetting'|'deleted'
  lastResetAt: timestamp('last_reset_at', { withTimezone: true }),
  seededModules: jsonb('seeded_modules'), // string[] of module keys that have been seeded
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// demo_tours — guided product tours created by admin
export const demoTours = pgTable('demo_tours', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  tourName: varchar('tour_name', { length: 255 }).notNull(),
  targetModule: varchar('target_module', { length: 100 }).notNull(),
  assignedPersona: varchar('assigned_persona', { length: 50 }).notNull().default('all'), // 'admin'|'manager'|'employee'|'all'
  steps: jsonb('steps').notNull(), // [{ order: number, targetSelector: string, tooltipText: string, title: string }]
  isPublished: boolean('is_published').notNull().default(false),
  completionCount: integer('completion_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// demo_sessions — tracks demo usage analytics
export const demoSessions = pgTable('demo_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  persona: varchar('persona', { length: 50 }).notNull(), // 'admin'|'manager'|'employee'
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  modulesVisited: jsonb('modules_visited'), // string[]
  durationSeconds: integer('duration_seconds'),
  converted: boolean('converted').notNull().default(false), // whether this demo led to signup
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
