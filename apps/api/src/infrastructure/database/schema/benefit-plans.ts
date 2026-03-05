import { pgTable, uuid, varchar, numeric, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const benefitPlans = pgTable('benefit_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'health' | 'dental' | 'vision' | 'life' | 'retirement' | 'wellness'
  description: varchar('description', { length: 1000 }),
  provider: varchar('provider', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  eligibilityRules: jsonb('eligibility_rules').default({}), // { minTenureMonths, grades[], entities[], employmentTypes[] }
  employerContribution: numeric('employer_contribution', { precision: 12, scale: 2 }),
  employerContributionType: varchar('employer_contribution_type', { length: 20 }).default('fixed'), // 'fixed' | 'percentage'
  employeeContribution: numeric('employee_contribution', { precision: 12, scale: 2 }),
  employeeContributionType: varchar('employee_contribution_type', { length: 20 }).default('fixed'),
  coverageDetails: jsonb('coverage_details').default({}),
  enrollmentStart: timestamp('enrollment_start', { withTimezone: true }),
  enrollmentEnd: timestamp('enrollment_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const benefitEnrollments = pgTable('benefit_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  planId: uuid('plan_id').notNull().references(() => benefitPlans.id),
  status: varchar('status', { length: 30 }).notNull().default('active'), // 'active' | 'pending' | 'cancelled' | 'expired'
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  dependents: jsonb('dependents').default([]), // array of { name, relation, dob }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
