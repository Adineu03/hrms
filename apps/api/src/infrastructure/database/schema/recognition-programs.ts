import { pgTable, uuid, varchar, numeric, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const recognitionPrograms = pgTable('recognition_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('spot'), // 'spot' | 'quarterly' | 'annual' | 'peer' | 'milestone'
  description: varchar('description', { length: 1000 }),
  frequency: varchar('frequency', { length: 30 }).notNull().default('anytime'), // 'anytime' | 'monthly' | 'quarterly' | 'annual'
  pointsValue: integer('points_value').notNull().default(0),
  budget: numeric('budget', { precision: 14, scale: 2 }).default('0'),
  spentBudget: numeric('spent_budget', { precision: 14, scale: 2 }).default('0'),
  nominationWorkflow: jsonb('nomination_workflow').default({}),
  eligibilityRules: jsonb('eligibility_rules').default({}),
  rewardCatalog: jsonb('reward_catalog').default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
