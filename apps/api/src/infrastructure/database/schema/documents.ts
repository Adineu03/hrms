import { pgTable, uuid, varchar, text, date, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(), // references users.id
  category: varchar('category', { length: 50 }).notNull(), // 'identity' | 'financial' | 'contracts' | 'certificates' | 'letters'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  fileUrl: varchar('file_url', { length: 500 }),
  fileSize: varchar('file_size', { length: 20 }),
  mimeType: varchar('mime_type', { length: 100 }),
  expiryDate: date('expiry_date'),
  isVerified: boolean('is_verified').notNull().default(false),
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  version: varchar('version', { length: 10 }).notNull().default('1'),
  previousVersionId: uuid('previous_version_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
