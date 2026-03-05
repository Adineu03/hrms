import { pgTable, uuid, varchar, integer, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const importStatusEnum = pgEnum('import_status', [
  'uploading',
  'parsing',
  'validating',
  'preview',
  'importing',
  'completed',
  'failed',
]);

export const dataImports = pgTable('data_imports', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  status: importStatusEnum('status').notNull().default('uploading'),
  totalRows: integer('total_rows').default(0),
  validRows: integer('valid_rows').default(0),
  errorRows: integer('error_rows').default(0),
  importedRows: integer('imported_rows').default(0),
  columnMapping: jsonb('column_mapping').default({}),
  validationErrors: jsonb('validation_errors').default([]),
  previewData: jsonb('preview_data').default([]),
  rawData: jsonb('raw_data').default([]),
  importedBy: uuid('imported_by').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
