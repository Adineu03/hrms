import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// integration_connectors — available integrations & their enabled/disabled state per org
export const integrationConnectors = pgTable('integration_connectors', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  connectorKey: varchar('connector_key', { length: 100 }).notNull(), // e.g. 'slack', 'quickbooks', 'google-workspace'
  connectorName: varchar('connector_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'hrms' | 'payroll' | 'erp' | 'communication' | 'other'
  description: text('description'),
  logoUrl: text('logo_url'),
  isEnabled: boolean('is_enabled').notNull().default(false),
  isAuthenticated: boolean('is_authenticated').notNull().default(false),
  authType: varchar('auth_type', { length: 30 }).default('oauth'), // 'oauth' | 'api_key' | 'basic'
  credentials: jsonb('credentials'), // encrypted token/key storage (opaque blob)
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  healthStatus: varchar('health_status', { length: 30 }).notNull().default('unknown'), // 'healthy' | 'degraded' | 'error' | 'unknown'
  healthCheckedAt: timestamp('health_checked_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  usageCount: integer('usage_count').notNull().default(0),
  config: jsonb('config'), // connector-specific settings
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// integration_logs — per-connector event logs
export const integrationLogs = pgTable('integration_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  connectorId: uuid('connector_id').notNull().references(() => integrationConnectors.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'sync' | 'auth' | 'error' | 'webhook'
  status: varchar('status', { length: 30 }).notNull(), // 'success' | 'failure' | 'partial'
  message: text('message'),
  payload: jsonb('payload'),
  durationMs: integer('duration_ms'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// api_keys — org-managed API keys
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 20 }).notNull(), // first 8 chars for display
  keyHash: varchar('key_hash', { length: 255 }).notNull(), // bcrypt hash of full key
  scopes: jsonb('scopes').notNull(), // string[] e.g. ['read:employees', 'write:attendance']
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  rateLimitPerMin: integer('rate_limit_per_min').notNull().default(60),
  ipWhitelist: jsonb('ip_whitelist'), // string[] of allowed IPs
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  usageCount: integer('usage_count').notNull().default(0),
  rotationReminderDays: integer('rotation_reminder_days').notNull().default(90),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedBy: uuid('revoked_by'),
  createdBy: uuid('created_by').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'revoked' | 'expired'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// webhooks — org-configured outbound webhooks
export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  endpointUrl: text('endpoint_url').notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(), // e.g. 'employee.created', 'leave.approved'
  secret: varchar('secret', { length: 255 }), // signing secret
  payloadFormat: varchar('payload_format', { length: 10 }).notNull().default('json'), // 'json' | 'form'
  isEnabled: boolean('is_enabled').notNull().default(true),
  retryPolicy: jsonb('retry_policy'), // { maxRetries: 3, backoffSeconds: [30, 60, 300] }
  lastDeliveryAt: timestamp('last_delivery_at', { withTimezone: true }),
  lastDeliveryStatus: varchar('last_delivery_status', { length: 20 }), // 'success' | 'failure'
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// oauth_apps — registered OAuth client apps
export const oauthApps = pgTable('oauth_apps', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  appName: varchar('app_name', { length: 255 }).notNull(),
  clientId: varchar('client_id', { length: 100 }).notNull(),
  clientSecretHash: varchar('client_secret_hash', { length: 255 }).notNull(),
  redirectUris: jsonb('redirect_uris').notNull(), // string[]
  scopes: jsonb('scopes').notNull(), // string[]
  description: text('description'),
  logoUrl: text('logo_url'),
  ownerEmail: varchar('owner_email', { length: 255 }),
  isPublic: boolean('is_public').notNull().default(false),
  authorizedUserCount: integer('authorized_user_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'suspended' | 'revoked'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// data_sync_configs — scheduled data sync configurations
export const dataSyncConfigs = pgTable('data_sync_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  connectorId: uuid('connector_id').references(() => integrationConnectors.id, { onDelete: 'set null' }),
  syncName: varchar('sync_name', { length: 255 }).notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'connector' | 'csv' | 'excel' | 'api'
  targetType: varchar('target_type', { length: 50 }).notNull(), // 'employees' | 'attendance' | 'payroll'
  frequency: varchar('frequency', { length: 30 }).notNull().default('daily'), // 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual'
  fieldMapping: jsonb('field_mapping'), // { sourceField: targetField } map
  filterCriteria: jsonb('filter_criteria'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncStatus: varchar('last_sync_status', { length: 20 }), // 'success' | 'failure' | 'partial'
  lastSyncRecordCount: integer('last_sync_record_count'),
  nextSyncAt: timestamp('next_sync_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
