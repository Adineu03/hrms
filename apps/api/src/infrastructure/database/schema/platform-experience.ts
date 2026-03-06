import { pgTable, uuid, varchar, boolean, jsonb, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('info'), // 'info' | 'warning' | 'success' | 'error' | 'action'
  channel: varchar('channel', { length: 30 }).notNull().default('in_app'), // 'in_app' | 'email' | 'push' | 'sms'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  moduleId: varchar('module_id', { length: 100 }),
  referenceId: uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 100 }),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(), // e.g. 'leave_approved', 'attendance_marked'
  channel: varchar('channel', { length: 30 }).notNull().default('in_app'),
  subject: varchar('subject', { length: 255 }),
  bodyTemplate: text('body_template').notNull(),
  variables: jsonb('variables').default([]), // available template variables
  isEnabled: boolean('is_enabled').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customDashboards = pgTable('custom_dashboards', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdById: uuid('created_by_id').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  isShared: boolean('is_shared').notNull().default(false),
  layout: jsonb('layout').default({}), // grid layout config
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dashboardWidgets = pgTable('dashboard_widgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  dashboardId: uuid('dashboard_id').notNull().references(() => customDashboards.id, { onDelete: 'cascade' }),
  widgetType: varchar('widget_type', { length: 50 }).notNull(), // 'chart' | 'kpi' | 'list' | 'table' | 'metric'
  title: varchar('title', { length: 255 }).notNull(),
  config: jsonb('config').default({}), // data source, filters, etc.
  position: jsonb('position').default({}), // { x, y }
  size: jsonb('size').default({}), // { w, h }
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  theme: varchar('theme', { length: 30 }).notNull().default('light'), // 'light' | 'dark' | 'system'
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  timezone: varchar('timezone', { length: 50 }),
  dateFormat: varchar('date_format', { length: 30 }).notNull().default('DD/MM/YYYY'),
  notificationPrefs: jsonb('notification_prefs').default({}), // { email: true, push: true, inApp: true, sms: false }
  accessibilitySettings: jsonb('accessibility_settings').default({}), // { fontSize, highContrast, reduceMotion }
  displayPrefs: jsonb('display_prefs').default({}), // { compactMode, sidebarCollapsed, defaultModule }
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  moduleId: varchar('module_id', { length: 100 }),
  path: varchar('path', { length: 500 }).notNull(),
  icon: varchar('icon', { length: 100 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
