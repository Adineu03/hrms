import { pgTable, uuid, varchar, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

export const customFieldDefinitions = pgTable('custom_field_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  entity: varchar('entity', { length: 50 }).notNull(), // 'employee' | 'department' | 'designation'
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  fieldLabel: varchar('field_label', { length: 200 }).notNull(),
  fieldType: varchar('field_type', { length: 30 }).notNull(), // 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'file'
  isRequired: boolean('is_required').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  options: jsonb('options').default([]), // for select/multiselect types
  validationRules: jsonb('validation_rules').default({}), // min, max, pattern, etc.
  defaultValue: varchar('default_value', { length: 500 }),
  section: varchar('section', { length: 100 }), // group fields into sections
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customFieldValues = pgTable('custom_field_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  fieldId: uuid('field_id').notNull().references(() => customFieldDefinitions.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id').notNull(), // the employee/department/designation id
  value: jsonb('value'), // stored as JSON for flexibility
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
