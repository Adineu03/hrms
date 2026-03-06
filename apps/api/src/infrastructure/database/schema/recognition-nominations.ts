import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { recognitionPrograms } from './recognition-programs';

export const recognitionNominations = pgTable('recognition_nominations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => recognitionPrograms.id, { onDelete: 'cascade' }),
  nomineeId: uuid('nominee_id').notNull(),
  nominatorId: uuid('nominator_id').notNull(),
  category: varchar('category', { length: 100 }).notNull().default('general'),
  reason: varchar('reason', { length: 2000 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'awarded'
  approvedBy: uuid('approved_by'),
  pointsAwarded: integer('points_awarded').notNull().default(0),
  awardDate: timestamp('award_date', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
