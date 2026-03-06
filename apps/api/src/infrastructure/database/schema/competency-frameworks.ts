import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const competencyFrameworks = pgTable('competency_frameworks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  proficiencyLevels: jsonb('proficiency_levels').default([]),
  departmentIds: jsonb('department_ids').default([]),
  gradeIds: jsonb('grade_ids').default([]),
  roleMapping: jsonb('role_mapping').default({}),
  isDefault: boolean('is_default').notNull().default(false),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
