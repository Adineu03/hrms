import { pgTable, uuid, varchar, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { learningPaths } from './learning-paths';
import { courses } from './courses';

export const learningPathItems = pgTable('learning_path_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  learningPathId: uuid('learning_path_id').notNull().references(() => learningPaths.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  itemType: varchar('item_type', { length: 30 }).notNull().default('course'),
  title: varchar('title', { length: 255 }).notNull(),
  order: integer('order').notNull().default(0),
  isRequired: boolean('is_required').notNull().default(true),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
