import { pgTable, uuid, varchar, numeric, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const investmentDeclarations = pgTable('investment_declarations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  fiscalYear: varchar('fiscal_year', { length: 20 }).notNull(),
  taxRegime: varchar('tax_regime', { length: 20 }).notNull().default('new'), // 'old' | 'new'
  section80c: jsonb('section_80c').default({}), // { ppf, elss, nsc, lifeInsurance, tuitionFees, etc. }
  section80d: jsonb('section_80d').default({}), // { selfPremium, parentsPremium, preventiveCheckup }
  hraExemption: jsonb('hra_exemption').default({}), // { rentPaid, cityType, monthsResiding }
  otherDeductions: jsonb('other_deductions').default({}), // { section80E, section80G, nps80ccd }
  totalDeclared: numeric('total_declared', { precision: 14, scale: 2 }).default('0'),
  totalVerified: numeric('total_verified', { precision: 14, scale: 2 }).default('0'),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // 'draft' | 'submitted' | 'verified' | 'locked'
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
