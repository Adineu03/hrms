// Core HR & People Data — Types (Phase 2)
// EXTENDS cold-start types — imports, does not duplicate

import type { EmployeeProfileData, EmployeeWithProfile, OrgChartNode, BankDetails } from './cold-start';

// Re-export for convenience
export type { EmployeeProfileData, EmployeeWithProfile, OrgChartNode };

// ─── Documents ───────────────────────────────────────────────────────────

export type DocumentCategory = 'identity' | 'financial' | 'contracts' | 'certificates' | 'letters';

export interface DocumentData {
  id?: string;
  employeeId: string;
  category: DocumentCategory;
  name: string;
  description?: string;
  fileUrl?: string;
  fileSize?: string;
  mimeType?: string;
  expiryDate?: string;
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  version?: string;
  previousVersionId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface DocumentUploadData {
  category: DocumentCategory;
  name: string;
  description?: string;
  expiryDate?: string;
  file?: File;
}

// ─── Self-Service Requests ───────────────────────────────────────────────

export type SelfServiceRequestType =
  | 'employment_verification'
  | 'noc'
  | 'experience_letter'
  | 'salary_certificate'
  | 'name_change'
  | 'bank_change'
  | 'address_change';

export type SelfServiceRequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';

export interface SelfServiceRequestData {
  id?: string;
  employeeId?: string;
  type: SelfServiceRequestType;
  status?: SelfServiceRequestStatus;
  priority?: string;
  subject: string;
  description?: string;
  data?: Record<string, unknown>;
  attachments?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  generatedDocUrl?: string;
  slaDeadline?: string;
  completedAt?: string;
  createdAt?: string;
}

// ─── Custom Fields ───────────────────────────────────────────────────────

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'file';

export interface CustomFieldDefinitionData {
  id?: string;
  entity: string; // 'employee' | 'department' | 'designation'
  fieldName: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  options?: string[];
  validationRules?: Record<string, unknown>;
  defaultValue?: string;
  section?: string;
}

export interface CustomFieldValueData {
  id?: string;
  fieldId: string;
  entityId: string;
  value: unknown;
}

// ─── Audit Logs ──────────────────────────────────────────────────────────

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}

// ─── Entities (Multi-Entity / Legal Entities) ────────────────────────────

export interface EntityData {
  id?: string;
  name: string;
  legalName?: string;
  registrationNumber?: string;
  taxId?: string;
  country: string;
  address?: string;
  city?: string;
  state?: string;
  currency?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  config?: Record<string, unknown>;
}

// ─── Salary Structures ───────────────────────────────────────────────────

export interface SalaryComponent {
  name: string;
  type: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage';
  value: number;
  isStatutory: boolean;
  percentageOf?: string; // for percentage type, what is it % of (e.g., 'basic')
}

export interface SalaryStructureData {
  id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  components: SalaryComponent[];
}

export interface EmployeeSalaryAssignmentData {
  id?: string;
  employeeId: string;
  salaryStructureId: string;
  ctc?: number;
  basicSalary?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  componentOverrides?: Record<string, number>;
}

// ─── Benefit Plans ───────────────────────────────────────────────────────

export type BenefitPlanType = 'health' | 'dental' | 'vision' | 'life' | 'retirement' | 'wellness';

export interface BenefitPlanData {
  id?: string;
  name: string;
  type: BenefitPlanType;
  description?: string;
  provider?: string;
  isActive?: boolean;
  eligibilityRules?: {
    minTenureMonths?: number;
    grades?: string[];
    entities?: string[];
    employmentTypes?: string[];
  };
  employerContribution?: number;
  employerContributionType?: 'fixed' | 'percentage';
  employeeContribution?: number;
  employeeContributionType?: 'fixed' | 'percentage';
  coverageDetails?: Record<string, unknown>;
  enrollmentStart?: string;
  enrollmentEnd?: string;
}

export interface BenefitEnrollmentData {
  id?: string;
  employeeId?: string;
  planId: string;
  status?: string;
  enrolledAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  dependents?: Array<{ name: string; relation: string; dob?: string }>;
}

// ─── Org Change Requests ─────────────────────────────────────────────────

export type ChangeRequestType = 'promotion' | 'transfer' | 'salary_change' | 'role_change' | 'reporting_change';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'implemented';

export interface OrgChangeRequestData {
  id?: string;
  requestedBy?: string;
  requestedByName?: string;
  type: ChangeRequestType;
  employeeId: string;
  employeeName?: string;
  status?: ChangeRequestStatus;
  currentData?: Record<string, unknown>;
  proposedData?: Record<string, unknown>;
  justification?: string;
  budgetImpact?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  implementedAt?: string;
  effectiveDate?: string;
  generatedLetterUrl?: string;
  createdAt?: string;
}

// ─── Enhanced Employee Profile (extends cold-start) ──────────────────────

export interface DependentData {
  name: string;
  relation: string;
  dateOfBirth?: string;
  gender?: string;
  isDependent?: boolean;
}

export interface PersonalIdData {
  type: string; // 'national_id' | 'passport' | 'visa' | 'driving_license'
  number: string;
  issuedBy?: string;
  issuedDate?: string;
  expiryDate?: string;
  fileUrl?: string;
}

export interface SkillData {
  name: string;
  proficiency?: string; // 'beginner' | 'intermediate' | 'advanced' | 'expert'
  yearsOfExperience?: number;
}

export interface EnhancedEmployeeProfile extends EmployeeProfileData {
  nationality?: string;
  maritalStatus?: string;
  dependents?: DependentData[];
  personalIds?: PersonalIdData[];
  skills?: SkillData[];
  languages?: string[];
  hobbies?: string[];
  profileCompleteness?: number; // 0-100
}

// ─── Compliance ──────────────────────────────────────────────────────────

export interface ComplianceItem {
  id?: string;
  employeeId: string;
  employeeName?: string;
  type: string; // 'certification' | 'training' | 'visa' | 'probation' | 'document'
  name: string;
  status: 'compliant' | 'expiring_soon' | 'expired' | 'missing';
  expiryDate?: string;
  daysUntilExpiry?: number;
}

// ─── Headcount ───────────────────────────────────────────────────────────

export interface HeadcountSummary {
  totalApproved: number;
  totalFilled: number;
  totalOpen: number;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    approved: number;
    filled: number;
    open: number;
  }>;
}

// ─── Field Access Controls ───────────────────────────────────────────────

export interface FieldAccessRule {
  id?: string;
  fieldPath: string; // e.g., 'bankDetails', 'salary', 'nationalId'
  roles: string[]; // which roles can see this field
  accessLevel: 'hidden' | 'masked' | 'read_only' | 'full_access';
}

// ─── Data Export ─────────────────────────────────────────────────────────

export interface DataExportRequest {
  entity: string;
  fields: string[];
  filters?: Record<string, unknown>;
  format: 'csv' | 'xlsx' | 'json';
}

export interface DataExportResult {
  id: string;
  fileName: string;
  downloadUrl: string;
  rowCount: number;
  createdAt: string;
}
