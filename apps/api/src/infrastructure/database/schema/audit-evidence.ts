import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// audit_evidence — evidence items collected for internal/external audits
export const auditEvidence = pgTable('audit_evidence', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'policy' | 'training' | 'access_review' | 'financial'
  description: text('description'),
  collectedBy: uuid('collected_by'),
  collectedAt: timestamp('collected_at', { withTimezone: true }),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'collected' | 'verified'
  fileCount: integer('file_count').notNull().default(0),
  relatedAuditName: varchar('related_audit_name', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
