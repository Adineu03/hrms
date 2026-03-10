import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// analytics_reports — saved reports built by admins
export const analyticsReports = pgTable('analytics_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  reportType: varchar('report_type', { length: 50 }).notNull().default('table'), // 'bar' | 'line' | 'pie' | 'table'
  sourceModules: jsonb('source_modules').notNull(), // string[] of module keys
  selectedFields: jsonb('selected_fields').notNull(), // { module: field[] }[]
  filters: jsonb('filters'), // filter criteria
  schedule: jsonb('schedule'), // { frequency: 'daily'|'weekly'|'monthly', deliveryEmail: string, format: 'csv'|'pdf' }
  isShared: boolean('is_shared').notNull().default(false),
  createdBy: uuid('created_by').notNull(),
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// analytics_dashboards — pinned KPI dashboards per org
export const analyticsDashboards = pgTable('analytics_dashboards', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  dashboardType: varchar('dashboard_type', { length: 50 }).notNull().default('org'), // 'org' | 'team' | 'personal'
  widgets: jsonb('widgets').notNull(), // { metricKey: string, label: string, position: number }[]
  filters: jsonb('filters'), // { department: string, location: string, dateRange: string }
  isDefault: boolean('is_default').notNull().default(false),
  ownerId: uuid('owner_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// analytics_kpis — custom metric / KPI definitions
export const analyticsKpis = pgTable('analytics_kpis', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  formula: text('formula').notNull(), // e.g. "revenue / headcount"
  description: text('description'),
  unit: varchar('unit', { length: 50 }), // 'currency' | 'percentage' | 'number'
  targetValue: integer('target_value'),
  thresholdLow: integer('threshold_low'),
  thresholdHigh: integer('threshold_high'),
  alertEnabled: boolean('alert_enabled').notNull().default(false),
  scope: varchar('scope', { length: 30 }).notNull().default('org'), // 'org' | 'department'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// analytics_snapshots — periodic metric snapshots for trend charts
export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  snapshotDate: varchar('snapshot_date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
  metricKey: varchar('metric_key', { length: 100 }).notNull(), // e.g. 'headcount', 'attrition_rate', 'attendance_rate'
  metricValue: integer('metric_value').notNull(),
  department: varchar('department', { length: 255 }),
  breakdown: jsonb('breakdown'), // optional sub-breakdown data
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
