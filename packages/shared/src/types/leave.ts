// Leave Management — Types (Phase 4)
// EXTENDS cold-start types — imports, does not duplicate

import type { EmployeeProfileData } from './cold-start';
import type { HolidayData } from './attendance';

// Re-export for convenience
export type { EmployeeProfileData, HolidayData };

// ─── Leave Types ────────────────────────────────────────────────────────

export type AccrualRule = 'monthly' | 'quarterly' | 'annual' | 'on_joining' | 'front_loaded';
export type LeaveYearStart = 'calendar_year' | 'financial_year' | 'custom';
export type SandwichRuleType = 'include_holidays' | 'include_weekends' | 'include_both';
export type LeaveRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
export type HalfDayType = 'first_half' | 'second_half';
export type CompOffWorkType = 'weekend' | 'holiday' | 'extra_hours';
export type CompOffStatus = 'active' | 'used' | 'expired' | 'cancelled';
export type DelegationType = 'approval' | 'responsibilities';

export interface LeaveTypeData {
  id?: string;
  name: string;
  code: string;
  isPaid?: boolean;
  accrualRule?: AccrualRule;
  daysPerYear: number;
  maxAccrualPerPeriod?: number;
  carryForwardEnabled?: boolean;
  maxCarryForwardDays?: number;
  carryForwardExpiryMonths?: number;
  encashmentEnabled?: boolean;
  maxEncashableDays?: number;
  probationAllowed?: boolean;
  probationDaysPerYear?: number;
  minConsecutiveDays?: number;
  maxConsecutiveDays?: number;
  requiresApproval?: boolean;
  requiresDocument?: boolean;
  documentThresholdDays?: number;
  applicableGender?: string;
  isCompOff?: boolean;
  color?: string;
  isActive?: boolean;
}

// ─── Leave Policy ───────────────────────────────────────────────────────

export interface AutoApprovalRule {
  leaveTypeId: string;
  leaveTypeName?: string;
  maxDays: number;
  conditions?: string[];
}

export interface CompOffEarningRule {
  workType: CompOffWorkType;
  daysEarned: number;
  description?: string;
}

export interface EncashmentRule {
  maxEncashableDays: number;
  rateFormula?: string;
  eligibleAfterMonths?: number;
  eligibleLeaveTypes?: string[];
}

export interface LeavePolicyData {
  id?: string;
  name?: string;
  leaveYearStart?: LeaveYearStart;
  customYearStartMonth?: number;
  customYearStartDay?: number;
  sandwichRuleEnabled?: boolean;
  sandwichRuleType?: SandwichRuleType;
  autoApprovalEnabled?: boolean;
  autoApprovalRules?: AutoApprovalRule[];
  escalationEnabled?: boolean;
  escalationHours?: number;
  halfDayEnabled?: boolean;
  backdatedLeaveDays?: number;
  minDaysBeforeRequest?: number;
  negativeBalanceAllowed?: boolean;
  maxNegativeBalanceDays?: number;
  yearEndProcessing?: Record<string, unknown>;
  compOffEarningRules?: CompOffEarningRule[];
  compOffExpiryDays?: number;
  encashmentRules?: EncashmentRule;
  isDefault?: boolean;
  isActive?: boolean;
}

// ─── Leave Approval Workflow ────────────────────────────────────────────

export interface ApprovalLevel {
  level: number;
  approverType: string; // 'manager' | 'hr' | 'skip_level' | 'specific_user'
  specificUserId?: string;
  specificUserName?: string;
}

export interface LeaveApprovalWorkflowData {
  id?: string;
  name: string;
  levels: ApprovalLevel[];
  applicableLeaveTypes?: string[];
  applicableDepartments?: string[];
  minDaysForMultiLevel?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

// ─── Leave Balance ──────────────────────────────────────────────────────

export interface LeaveBalanceData {
  id?: string;
  employeeId?: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  color?: string;
  year: string;
  entitled: number;
  accrued: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjusted: number;
  available: number;
}

// ─── Leave Request ──────────────────────────────────────────────────────

export interface DayBreakdownItem {
  date: string;
  leaveTypeId: string;
  isHalfDay: boolean;
  halfDayType?: HalfDayType;
  days: number;
}

export interface ApprovalChainItem {
  level: number;
  approverId: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  actionAt?: string;
}

export interface LeaveRequestData {
  id?: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  isHalfDay?: boolean;
  halfDayType?: HalfDayType;
  reason?: string;
  attachments?: string[];
  status?: LeaveRequestStatus;
  approvalChain?: ApprovalChainItem[];
  currentApproverLevel?: number;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  approverComment?: string;
  cancelledAt?: string;
  cancelReason?: string;
  delegateId?: string;
  delegateName?: string;
  dayBreakdown?: DayBreakdownItem[];
  createdAt?: string;
}

// ─── Comp-Off Records ───────────────────────────────────────────────────

export interface CompOffRecordData {
  id?: string;
  employeeId?: string;
  employeeName?: string;
  earnedDate: string;
  reason: string;
  workType: CompOffWorkType;
  daysEarned: number;
  daysUsed: number;
  daysAvailable: number;
  expiryDate?: string;
  status?: CompOffStatus;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  linkedLeaveRequestId?: string;
  createdAt?: string;
}

// ─── Leave Delegations ─────────────────────────────────────────────────

export interface LeaveDelegationData {
  id?: string;
  delegatorId: string;
  delegatorName?: string;
  delegateId: string;
  delegateName?: string;
  startDate: string;
  endDate: string;
  delegationType: DelegationType;
  isActive?: boolean;
  activatedAt?: string;
  autoActivated?: boolean;
  createdAt?: string;
}

// ─── Dashboard & Summary Types ──────────────────────────────────────────

export interface LeaveBalanceSummary {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  color: string;
  entitled: number;
  accrued: number;
  used: number;
  pending: number;
  available: number;
  carriedForward: number;
}

export interface TeamLeaveCalendarEntry {
  date: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  status: LeaveRequestStatus | 'holiday' | 'weekend';
  isHalfDay?: boolean;
  halfDayType?: HalfDayType;
}

export interface TeamAvailabilitySummary {
  date: string;
  totalEmployees: number;
  available: number;
  onLeave: number;
  onHoliday: number;
  pending: number;
}

export interface LeaveUtilizationReport {
  employeeId: string;
  employeeName: string;
  department?: string;
  leaveType: string;
  entitled: number;
  used: number;
  pending: number;
  available: number;
  utilizationPercent: number;
}

export interface LeaveReportFilters {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  locationId?: string;
  leaveTypeId?: string;
  employeeId?: string;
  status?: LeaveRequestStatus;
}

// ─── Leave Insights ────────────────────────────────────────────────────

export interface LeaveInsightsSummary {
  totalEntitled: number;
  totalUsed: number;
  totalPending: number;
  totalAvailable: number;
  utilizationPercent: number;
  mostUsedType?: string;
  averagePerMonth: number;
  trendDirection: 'up' | 'down' | 'stable';
}

export interface LeaveMonthlyTrend {
  month: string;
  year: string;
  daysUsed: number;
  leaveType?: string;
}

export interface LeaveTypeBreakdown {
  leaveTypeId: string;
  leaveTypeName: string;
  color: string;
  daysUsed: number;
  percentage: number;
}
