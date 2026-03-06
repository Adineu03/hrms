import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const feedbackRecords = pgTable('feedback_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  fromUserId: uuid('from_user_id').notNull().references(() => users.id),
  toUserId: uuid('to_user_id').notNull().references(() => users.id),
  type: varchar('type', { length: 30 }).notNull().default('general'),
  category: varchar('category', { length: 50 }),
  content: text('content').notNull(),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  visibility: varchar('visibility', { length: 30 }).notNull().default('private'),
  responseContent: text('response_content'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  requestId: uuid('request_id'),
  requestedByUserId: uuid('requested_by_user_id').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
