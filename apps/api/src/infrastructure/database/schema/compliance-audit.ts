import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// compliance_policies — policy library with version control, effective dates, approval workflow
export const compliancePolicies = pgTable('compliance_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  policyCode: varchar('policy_code', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'hr' | 'it' | 'safety' | 'ethics' | 'data-privacy' | 'other'
  description: text('description'),
  content: text('content'),
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  previousVersionId: uuid('previous_version_id'),
  effectiveDate: timestamp('effective_date', { withTimezone: true }),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'pending_approval' | 'published' | 'archived'
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  mandatoryAcknowledgment: boolean('mandatory_acknowledgment').notNull().default(false),
  reminderCadenceDays: integer('reminder_cadence_days').default(30),
  appliesToEntity: varchar('applies_to_entity', { length: 100 }), // null = all
  appliesToLocation: varchar('applies_to_location', { length: 100 }),
  appliesToDepartment: uuid('applies_to_department'),
  appliesToGrade: varchar('applies_to_grade', { length: 100 }),
  jurisdiction: varchar('jurisdiction', { length: 100 }),
  language: varchar('language', { length: 20 }).notNull().default('en'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// policy_acknowledgments — employee acknowledgments per policy version
export const policyAcknowledgments = pgTable('policy_acknowledgments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  policyId: uuid('policy_id').notNull().references(() => compliancePolicies.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  policyVersion: varchar('policy_version', { length: 20 }).notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// compliance_trainings — mandatory compliance training catalog
export const complianceTrainings = pgTable('compliance_trainings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'harassment' | 'data-privacy' | 'safety' | 'anti-bribery' | 'other'
  description: text('description'),
  content: text('content'),
  durationMinutes: integer('duration_minutes').default(60),
  passingScore: integer('passing_score').default(80), // percentage
  validityMonths: integer('validity_months').default(12), // renewal cycle
  isMandatory: boolean('is_mandatory').notNull().default(true),
  appliesToRole: varchar('applies_to_role', { length: 50 }), // null = all
  appliesToDepartment: uuid('applies_to_department'),
  deadlineDays: integer('deadline_days').default(30), // days from assignment to complete
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// training_completions — employee training completion records
export const trainingCompletions = pgTable('training_completions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  trainingId: uuid('training_id').notNull().references(() => complianceTrainings.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  score: integer('score'), // percentage
  passed: boolean('passed'),
  certificateUrl: varchar('certificate_url', { length: 500 }),
  renewalDue: timestamp('renewal_due', { withTimezone: true }),
  status: varchar('status', { length: 30 }).notNull().default('assigned'), // 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'expired'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ethics_complaints — anonymous ethics/whistleblower complaints
export const ethicsComplaints = pgTable('ethics_complaints', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  referenceCode: varchar('reference_code', { length: 20 }).notNull(), // anonymous tracking code
  category: varchar('category', { length: 100 }).notNull(), // 'harassment' | 'fraud' | 'safety' | 'discrimination' | 'other'
  description: text('description').notNull(),
  incidentDate: timestamp('incident_date', { withTimezone: true }),
  location: varchar('location', { length: 255 }),
  status: varchar('status', { length: 30 }).notNull().default('received'), // 'received' | 'in_progress' | 'findings' | 'resolution' | 'closed'
  investigatorId: uuid('investigator_id'),
  investigationNotes: text('investigation_notes'),
  outcome: text('outcome'),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  reporterEmployeeId: uuid('reporter_employee_id'), // null if truly anonymous
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// audit_trail_configs — per-org audit trail configuration (retention policies, what to track)
export const auditTrailConfigs = pgTable('audit_trail_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  entity: varchar('entity', { length: 100 }).notNull(), // 'employee' | 'payroll' | 'leave' | 'expense' etc.
  retentionDays: integer('retention_days').notNull().default(365),
  isTracked: boolean('is_tracked').notNull().default(true),
  trackCreate: boolean('track_create').notNull().default(true),
  trackUpdate: boolean('track_update').notNull().default(true),
  trackDelete: boolean('track_delete').notNull().default(true),
  trackView: boolean('track_view').notNull().default(false),
  trackExport: boolean('track_export').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// compliance_checklists — jurisdiction-specific compliance checklists and statutory items
export const complianceChecklists = pgTable('compliance_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  jurisdiction: varchar('jurisdiction', { length: 100 }).notNull(), // 'IN-PF' | 'IN-ESI' | 'IN-LWF' | 'IN-PT' | 'US-EEO' etc.
  category: varchar('category', { length: 100 }).notNull(), // 'statutory-filing' | 'labor-law' | 'safety' | 'diversity'
  description: text('description'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  frequency: varchar('frequency', { length: 30 }).default('annual'), // 'monthly' | 'quarterly' | 'annual' | 'one-time'
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'in_progress' | 'completed' | 'overdue'
  assignedTo: uuid('assigned_to'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  evidenceNotes: text('evidence_notes'),
  metadata: jsonb('metadata'), // additional statutory info
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
