// Cold Start & Setup — Feature Mode types

import type { UserRole } from './auth';

// ─── Enhanced Company Profile ─────────────────────────────────────────────

export interface EnhancedCompanyProfileData {
  name: string;
  legalName?: string;
  tradeLicense?: string;
  registrationNumber?: string;
  taxId?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  website?: string;
  brandColor?: string;
  companySizeBracket?: string; // '1-10' | '11-50' | '51-200' | '201-500' | '500+'
}

// ─── Organization Settings ────────────────────────────────────────────────

export interface OrgSettingsData {
  country?: string;       // ISO 3166-1 alpha-2 e.g. "IN", "US"
  currency?: string;      // ISO 4217 e.g. "INR", "USD"
  timezone?: string;      // IANA e.g. "Asia/Kolkata"
  dateFormat?: string;    // 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  locale?: string;        // 'en-IN', 'en-US'
  fiscalYearStart?: string; // 'january' | 'april' | 'july'
  multiEntity?: boolean;
}

export interface CountryDefaults {
  country: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  locale: string;
  fiscalYearStart: string;
  laborLaw: {
    minWage: number;
    maxWorkHoursPerWeek: number;
    mandatoryLeaves: string[];
    probationMaxMonths: number;
    noticePeriodDays: number;
    overtimeMultiplier: number;
  };
}

// ─── Locations ────────────────────────────────────────────────────────────

export interface LocationData {
  id?: string;
  name: string;
  code?: string;
  type?: string; // 'office' | 'branch' | 'warehouse' | 'remote_hub'
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  geoFenceRadius?: number;
  isPrimary?: boolean;
  isActive?: boolean;
}

// ─── Grades ───────────────────────────────────────────────────────────────

export interface GradeData {
  id?: string;
  name: string;
  level: number;
  salaryBandMin?: number;
  salaryBandMax?: number;
  currency?: string;
  description?: string;
}

// ─── Invitations ──────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface SendInvitationData {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  managerId?: string;
}

export interface InvitationData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  managerId?: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface InviteValidationResult {
  valid: boolean;
  email?: string;
  orgName?: string;
  firstName?: string;
  lastName?: string;
  expired?: boolean;
  alreadyAccepted?: boolean;
}

export interface AcceptInviteData {
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

// ─── Employee Profiles ────────────────────────────────────────────────────

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
}

export interface AddressData {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed';

export interface EmployeeProfileData {
  id?: string;
  userId: string;
  employeeId?: string;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  gradeId?: string;
  managerId?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  personalEmail?: string;
  dateOfJoining?: string;
  probationEndDate?: string;
  employmentType?: string; // 'full_time' | 'part_time' | 'contract' | 'intern'
  workModel?: string;      // 'office' | 'hybrid' | 'remote' | 'field'
  profilePhotoUrl?: string;
  emergencyContacts?: EmergencyContact[];
  bankDetails?: BankDetails;
  address?: { current?: AddressData; permanent?: AddressData };
  onboardingStatus?: OnboardingStatus;
  onboardingProgress?: Record<string, boolean>;
}

export interface EmployeeWithProfile {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  profile?: EmployeeProfileData;
}

// ─── Data Import ──────────────────────────────────────────────────────────

export type ImportStatus = 'uploading' | 'parsing' | 'validating' | 'preview' | 'importing' | 'completed' | 'failed';

export interface DataImportInfo {
  id: string;
  type: string;
  fileName: string;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  createdAt: string;
  completedAt?: string;
}

export interface ColumnMappingData {
  [targetField: string]: string; // maps our field name to their column header
}

export interface ImportValidationError {
  row: number;
  column: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface ImportUploadResult {
  importId: string;
  fileName: string;
  headers: string[];
  rowCount: number;
  suggestedMapping: ColumnMappingData;
}

export interface ImportValidationResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ImportValidationError[];
  preview: Record<string, unknown>[];
}

export interface ImportExecuteResult {
  importedRows: number;
  skippedRows: number;
  errors: ImportValidationError[];
}

// ─── Settings Dashboard ───────────────────────────────────────────────────

export interface SettingsDashboard {
  employeeCount: number;
  departmentCount: number;
  locationCount: number;
  gradeCount: number;
  pendingInvitations: number;
  recentImports: DataImportInfo[];
  setupCompleteness: number; // 0-100
}

// ─── Org Chart ────────────────────────────────────────────────────────────

export interface OrgChartNode {
  user: { id: string; firstName: string; lastName?: string; email: string };
  profile: {
    designation?: string;
    department?: string;
    profilePhotoUrl?: string;
  };
  children: OrgChartNode[];
}

// ─── Employee Import Template Fields ──────────────────────────────────────

export const EMPLOYEE_IMPORT_FIELDS = [
  { field: 'firstName', label: 'First Name', required: true },
  { field: 'lastName', label: 'Last Name', required: false },
  { field: 'email', label: 'Email', required: true },
  { field: 'phone', label: 'Phone', required: false },
  { field: 'department', label: 'Department', required: false },
  { field: 'designation', label: 'Designation', required: false },
  { field: 'dateOfJoining', label: 'Date of Joining', required: false },
  { field: 'employmentType', label: 'Employment Type', required: false },
  { field: 'managerId', label: 'Manager Email', required: false },
  { field: 'gender', label: 'Gender', required: false },
  { field: 'dateOfBirth', label: 'Date of Birth', required: false },
] as const;
