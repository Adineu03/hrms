import { pgTable, uuid, varchar, numeric, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const salaryStructures = pgTable('salary_structures', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  components: jsonb('components').default([]), // array of { name, type: 'earning'|'deduction', calculationType: 'fixed'|'percentage', value, isStatutory }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const employeeSalaryAssignments = pgTable('employee_salary_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  salaryStructureId: uuid('salary_structure_id').notNull().references(() => salaryStructures.id),
  ctc: numeric('ctc', { precision: 14, scale: 2 }),
  basicSalary: numeric('basic_salary', { precision: 14, scale: 2 }),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  componentOverrides: jsonb('component_overrides').default({}), // per-employee overrides
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
