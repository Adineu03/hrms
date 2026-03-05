import { pgTable, uuid, varchar, date, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

export const employeeProfiles = pgTable('employee_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  employeeId: varchar('employee_id', { length: 50 }),
  departmentId: uuid('department_id'),
  designationId: uuid('designation_id'),
  locationId: uuid('location_id'),
  gradeId: uuid('grade_id'),
  managerId: uuid('manager_id'),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  phone: varchar('phone', { length: 20 }),
  personalEmail: varchar('personal_email', { length: 255 }),
  dateOfJoining: date('date_of_joining'),
  probationEndDate: date('probation_end_date'),
  employmentType: varchar('employment_type', { length: 30 }).default('full_time'),
  workModel: varchar('work_model', { length: 20 }).default('office'),
  profilePhotoUrl: varchar('profile_photo_url', { length: 500 }),
  emergencyContacts: jsonb('emergency_contacts').default([]),
  bankDetails: jsonb('bank_details').default({}),
  documents: jsonb('documents').default([]),
  address: jsonb('address').default({}),
  onboardingStatus: varchar('onboarding_status', { length: 30 }).default('pending'),
  onboardingProgress: jsonb('onboarding_progress').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
