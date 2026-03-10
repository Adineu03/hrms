import { pgTable, uuid, varchar, text, boolean, integer, decimal, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// workforce_headcount_plans — org-wide headcount planning per department/location
export const workforceHeadcountPlans = pgTable('workforce_headcount_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  planYear: integer('plan_year').notNull(),
  departmentId: uuid('department_id'),
  locationId: uuid('location_id'),
  gradeId: uuid('grade_id'),
  entityId: uuid('entity_id'),
  currentHeadcount: integer('current_headcount').notNull().default(0),
  approvedHeadcount: integer('approved_headcount').notNull().default(0),
  targetHeadcount: integer('target_headcount').notNull().default(0),
  openRequisitions: integer('open_requisitions').notNull().default(0),
  hiringFreezeActive: boolean('hiring_freeze_active').notNull().default(false),
  hiringFreezeReason: text('hiring_freeze_reason'),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'pending_approval' | 'approved' | 'active'
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// workforce_budgets — compensation budgets by department/cost center
export const workforceBudgets = pgTable('workforce_budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  budgetName: varchar('budget_name', { length: 255 }).notNull(),
  budgetYear: integer('budget_year').notNull(),
  departmentId: uuid('department_id'),
  costCenter: varchar('cost_center', { length: 100 }),
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  actualSpend: decimal('actual_spend', { precision: 15, scale: 2 }).notNull().default('0'),
  projectedSpend: decimal('projected_spend', { precision: 15, scale: 2 }).notNull().default('0'),
  salaryIncreasePool: decimal('salary_increase_pool', { precision: 15, scale: 2 }).default('0'),
  benefitsCostProjected: decimal('benefits_cost_projected', { precision: 15, scale: 2 }).default('0'),
  fteCount: integer('fte_count').default(0),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'pending_approval' | 'approved' | 'active'
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// succession_plans — key position succession tracking
export const successionPlans = pgTable('succession_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  positionTitle: varchar('position_title', { length: 255 }).notNull(),
  departmentId: uuid('department_id'),
  currentHolderId: uuid('current_holder_id'),
  isKeyPosition: boolean('is_key_position').notNull().default(true),
  criticalityLevel: varchar('criticality_level', { length: 30 }).notNull().default('high'), // 'critical' | 'high' | 'medium'
  benchStrength: varchar('bench_strength', { length: 30 }).default('weak'), // 'strong' | 'adequate' | 'weak' | 'none'
  successionCoveragePercent: integer('succession_coverage_percent').default(0),
  notes: text('notes'),
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by'),
  status: varchar('status', { length: 30 }).notNull().default('active'), // 'active' | 'archived'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// succession_candidates — candidates for succession positions
export const successionCandidates = pgTable('succession_candidates', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  successionPlanId: uuid('succession_plan_id').notNull().references(() => successionPlans.id, { onDelete: 'cascade' }),
  candidateEmployeeId: uuid('candidate_employee_id').notNull(),
  readinessLevel: varchar('readiness_level', { length: 30 }).notNull().default('2yr'), // 'ready_now' | '1yr' | '2yr'
  performanceRating: varchar('performance_rating', { length: 30 }), // 'exceptional' | 'meets' | 'needs_improvement'
  potentialRating: varchar('potential_rating', { length: 30 }), // 'high' | 'medium' | 'low'
  flightRisk: varchar('flight_risk', { length: 20 }).default('low'), // 'high' | 'medium' | 'low'
  developmentNotes: text('development_notes'),
  nominatedBy: uuid('nominated_by'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  status: varchar('status', { length: 30 }).notNull().default('nominated'), // 'nominated' | 'approved' | 'removed'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// internal_transfer_requests — employee transfer and mobility requests
export const internalTransferRequests = pgTable('internal_transfer_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  requestType: varchar('request_type', { length: 30 }).notNull(), // 'transfer' | 'lateral_move' | 'promotion' | 'location_change'
  fromDepartmentId: uuid('from_department_id'),
  toDepartmentId: uuid('to_department_id'),
  fromLocationId: uuid('from_location_id'),
  toLocationId: uuid('to_location_id'),
  fromEntityId: uuid('from_entity_id'),
  toEntityId: uuid('to_entity_id'),
  fromDesignationId: uuid('from_designation_id'),
  toDesignationId: uuid('to_designation_id'),
  effectiveDate: timestamp('effective_date', { withTimezone: true }),
  reason: text('reason'),
  managerInitiated: boolean('manager_initiated').notNull().default(false),
  initiatedBy: uuid('initiated_by'),
  currentApproverId: uuid('current_approver_id'),
  backfillRequired: boolean('backfill_required').notNull().default(false),
  backfillStatus: varchar('backfill_status', { length: 30 }).default('not_started'), // 'not_started' | 'in_progress' | 'filled'
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// role_grade_definitions — job family and grade architecture
export const roleGradeDefinitions = pgTable('role_grade_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  roleTitle: varchar('role_title', { length: 255 }).notNull(),
  jobFamily: varchar('job_family', { length: 100 }).notNull(), // e.g., 'Engineering' | 'Sales' | 'HR'
  jobFunction: varchar('job_function', { length: 100 }), // e.g., 'Frontend' | 'Backend' | 'DevOps'
  gradeCode: varchar('grade_code', { length: 30 }).notNull(), // e.g., 'IC1' | 'IC2' | 'M1' | 'M2'
  gradeLevel: integer('grade_level').notNull().default(1),
  salaryRangeMin: decimal('salary_range_min', { precision: 15, scale: 2 }),
  salaryRangeMax: decimal('salary_range_max', { precision: 15, scale: 2 }),
  salaryRangeMid: decimal('salary_range_mid', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  roleDescription: text('role_description'),
  keyResponsibilities: jsonb('key_responsibilities'), // string[]
  competencyRequirements: jsonb('competency_requirements'), // string[]
  typicalExperienceYears: varchar('typical_experience_years', { length: 30 }), // e.g., '2-4 years'
  isManagerialRole: boolean('is_managerial_role').notNull().default(false),
  reportingToGradeCode: varchar('reporting_to_grade_code', { length: 30 }),
  equivalentRoles: jsonb('equivalent_roles'), // cross-function equivalents
  progressionPaths: jsonb('progression_paths'), // next grade options
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
