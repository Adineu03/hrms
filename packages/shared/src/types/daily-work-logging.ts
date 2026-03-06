// Daily Work Logging — Types (Phase 5)
// EXTENDS cold-start types — imports, does not duplicate

import type { EmployeeProfileData } from './cold-start';

// Re-export for convenience
export type { EmployeeProfileData };

// ─── Status & Enum Types ────────────────────────────────────────────────

export type SubmissionFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'project_based';
export type SubmissionDeadline = 'end_of_day' | 'end_of_week' | 'end_of_month' | 'custom';
export type RoundingRule = 'none' | 'nearest_15' | 'nearest_30' | 'nearest_60';
export type TimesheetEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type TimesheetSubmissionStatus = 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'revision_requested';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskCategoryType = 'development' | 'meetings' | 'admin' | 'training' | 'break' | 'travel' | 'review' | 'documentation' | 'general';

// ─── Project ────────────────────────────────────────────────────────────

export interface ProjectData {
  id?: string;
  name: string;
  code: string;
  clientName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budgetHours?: number;
  isBillable?: boolean;
  billableRate?: number;
  currency?: string;
  status?: ProjectStatus;
  color?: string;
  isActive?: boolean;
}

export interface ProjectAssignmentData {
  id?: string;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  employeeId: string;
  employeeName?: string;
  role?: string;
  allocationPercentage?: number;
  startDate?: string;
  endDate?: string;
  isBillable?: boolean;
  billableRate?: number;
  isActive?: boolean;
}

// ─── Task Categories ────────────────────────────────────────────────────

export interface TaskCategoryData {
  id?: string;
  name: string;
  code?: string;
  type?: TaskCategoryType;
  isBillable?: boolean;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Timesheet Policy ───────────────────────────────────────────────────

export interface TimesheetApprovalLevel {
  level: number;
  role: string;
  description?: string;
}

export interface TimesheetAutoApprovalRule {
  condition: string;
  maxHours?: number;
  description?: string;
}

export interface TimesheetPolicyData {
  id?: string;
  name?: string;
  submissionFrequency?: SubmissionFrequency;
  submissionDeadline?: SubmissionDeadline;
  customDeadlineDay?: number;
  customDeadlineTime?: string;
  minHoursPerDay?: number;
  maxHoursPerDay?: number;
  minHoursPerWeek?: number;
  maxHoursPerWeek?: number;
  roundingRule?: RoundingRule;
  roundingInterval?: number;
  lockAfterApproval?: boolean;
  lockAfterDays?: number;
  gracePeriodDays?: number;
  dailyMandatory?: boolean;
  requireDescription?: boolean;
  autoApprovalEnabled?: boolean;
  autoApprovalRules?: TimesheetAutoApprovalRule[];
  escalationEnabled?: boolean;
  escalationHours?: number;
  approvalLevels?: TimesheetApprovalLevel[];
  delegationRules?: Record<string, unknown>;
}

// ─── Timesheet Entry ────────────────────────────────────────────────────

export interface TimesheetEntryData {
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  projectId?: string;
  projectName?: string;
  projectCode?: string;
  taskCategoryId?: string;
  taskCategoryName?: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  description?: string;
  isBillable?: boolean;
  tags?: string[];
  activityType?: string;
  submissionId?: string;
  status?: TimesheetEntryStatus;
}

// ─── Timesheet Submission ───────────────────────────────────────────────

export interface SubmissionApprovalChainItem {
  level: number;
  approverId: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  actionAt?: string;
}

export interface TimesheetDayBreakdownItem {
  date: string;
  totalHours: number;
  billableHours: number;
  entries: number;
  projects: string[];
}

export interface TimesheetSubmissionData {
  id?: string;
  employeeId: string;
  employeeName?: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  billableHours?: number;
  nonBillableHours?: number;
  status?: TimesheetSubmissionStatus;
  summaryNote?: string;
  approvalChain?: SubmissionApprovalChainItem[];
  currentApproverLevel?: number;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  approverComment?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  lockedAt?: string;
  dayBreakdown?: TimesheetDayBreakdownItem[];
}

// ─── Timer Session ──────────────────────────────────────────────────────

export interface TimerSessionData {
  id?: string;
  employeeId: string;
  projectId?: string;
  projectName?: string;
  taskCategoryId?: string;
  taskCategoryName?: string;
  description?: string;
  startTime: string;
  endTime?: string;
  pausedAt?: string;
  totalPausedSeconds?: number;
  isRunning: boolean;
  isPaused?: boolean;
  linkedEntryId?: string;
  isBillable?: boolean;
  elapsedSeconds?: number;
}

// ─── Dashboard & Report Types ───────────────────────────────────────────

export interface TeamTimesheetStatus {
  employeeId: string;
  employeeName: string;
  department?: string;
  status: 'submitted' | 'pending' | 'draft' | 'not_started' | 'late';
  totalHours: number;
  billableHours: number;
  submittedAt?: string;
  periodStart: string;
  periodEnd: string;
}

export interface ProjectUtilizationReport {
  projectId: string;
  projectName: string;
  projectCode: string;
  budgetHours: number;
  actualHours: number;
  remainingHours: number;
  burnRate: number;
  billableHours: number;
  utilizationPercentage: number;
  teamBreakdown: { employeeName: string; hours: number }[];
}

export interface EmployeeProductivitySummary {
  totalHoursLogged: number;
  expectedHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationPercentage: number;
  projectBreakdown: { projectName: string; hours: number; percentage: number }[];
  categoryBreakdown: { categoryName: string; hours: number; percentage: number }[];
  weeklyTrend: { week: string; hours: number }[];
  complianceRate: number;
}

export interface SubmissionComplianceReport {
  employeeId: string;
  employeeName: string;
  totalPeriods: number;
  onTimeSubmissions: number;
  lateSubmissions: number;
  missedSubmissions: number;
  complianceScore: number;
}

export interface TimesheetCorrectionData {
  id?: string;
  submissionId: string;
  correctedBy: string;
  correctedByName?: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  reason: string;
  correctedAt?: string;
}

export interface ResourceAllocationView {
  employeeId: string;
  employeeName: string;
  totalCapacityHours: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPercentage: number;
  projects: { projectName: string; allocatedHours: number; role?: string }[];
  isOverAllocated: boolean;
  isUnderAllocated: boolean;
}
