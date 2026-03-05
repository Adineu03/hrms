// Time & Attendance — Types (Phase 3)
// EXTENDS cold-start types — imports, does not duplicate

import type { EmployeeProfileData } from './cold-start';

// Re-export for convenience
export type { EmployeeProfileData };

// ─── Shifts ──────────────────────────────────────────────────────────────

export type ShiftType = 'general' | 'morning' | 'evening' | 'night' | 'rotational' | 'flexible';

export interface BreakConfigItem {
  type: string; // 'lunch' | 'tea' | 'prayer' | 'personal'
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  isPaid: boolean;
}

export interface ShiftData {
  id?: string;
  name: string;
  code?: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  graceMinutesLate?: number;
  graceMinutesEarly?: number;
  isNightShift?: boolean;
  isFlexible?: boolean;
  flexCoreStart?: string;
  flexCoreEnd?: string;
  minWorkHours?: number;
  breakConfig?: BreakConfigItem[];
  rotationPattern?: string;
  swapEnabled?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

// ─── Shift Assignments ──────────────────────────────────────────────────

export interface ShiftAssignmentData {
  id?: string;
  employeeId: string;
  employeeName?: string;
  shiftId: string;
  shiftName?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isCurrent?: boolean;
}

// ─── Shift Swap Requests ────────────────────────────────────────────────

export type ShiftSwapStatus = 'pending_partner' | 'pending_manager' | 'approved' | 'rejected' | 'cancelled';

export interface ShiftSwapRequestData {
  id?: string;
  requesterId: string;
  requesterName?: string;
  targetEmployeeId: string;
  targetEmployeeName?: string;
  requesterShiftId: string;
  requesterShiftName?: string;
  targetShiftId: string;
  targetShiftName?: string;
  swapDate: string;
  reason?: string;
  status?: ShiftSwapStatus;
  partnerAcceptedAt?: string;
  managerApprovedAt?: string;
  managerComment?: string;
  createdAt?: string;
}

// ─── Attendance Records ─────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'weekend' | 'wfh' | 'late';
export type ClockMethod = 'web' | 'mobile' | 'biometric' | 'geo_fence' | 'wifi' | 'qr' | 'manual' | 'nfc';

export interface ClockLocationData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  withinGeoFence?: boolean;
}

export interface AttendanceRecordData {
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  shiftId?: string;
  shiftName?: string;
  clockIn?: string;
  clockOut?: string;
  clockInMethod?: ClockMethod;
  clockOutMethod?: ClockMethod;
  clockInLocation?: ClockLocationData;
  clockOutLocation?: ClockLocationData;
  status: AttendanceStatus;
  lateMinutes?: number;
  earlyDepartureMinutes?: number;
  totalWorkMinutes?: number;
  totalBreakMinutes?: number;
  overtimeMinutes?: number;
  isHalfDay?: boolean;
  isOvertime?: boolean;
  isRegularized?: boolean;
  isLocked?: boolean;
  remarks?: string;
  breaks?: AttendanceBreakData[];
}

// ─── Attendance Breaks ──────────────────────────────────────────────────

export interface AttendanceBreakData {
  id?: string;
  attendanceRecordId?: string;
  breakType: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
}

// ─── Overtime Requests ──────────────────────────────────────────────────

export type OvertimeRequestType = 'pre_approval' | 'post_facto';
export type OvertimeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface OvertimeRequestData {
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  type: OvertimeRequestType;
  estimatedHours?: number;
  actualHours?: number;
  reason?: string;
  reasonCode?: string;
  status?: OvertimeRequestStatus;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewerComment?: string;
  overtimeRate?: string;
  compOffEligible?: string;
  createdAt?: string;
}

// ─── Regularization Requests ────────────────────────────────────────────

export type RegularizationStatus = 'pending' | 'approved' | 'rejected';

export interface RegularizationRequestData {
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  punchType: 'clock_in' | 'clock_out';
  requestedTime: string;
  reason: string;
  reasonCode?: string;
  evidence?: string[];
  status?: RegularizationStatus;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewerComment?: string;
  slaDeadline?: string;
  createdAt?: string;
}

// ─── Holiday Calendar ───────────────────────────────────────────────────

export type HolidayType = 'national' | 'regional' | 'org_specific' | 'floating';

export interface HolidayData {
  id?: string;
  name: string;
  date: string;
  type: HolidayType;
  isOptional?: boolean;
  isFloating?: boolean;
  applicableLocations?: string[];
  applicableDepartments?: string[];
  year: string;
  description?: string;
}

// ─── Attendance Policy ──────────────────────────────────────────────────

export interface LateMarkRule {
  lateCountPerMonth: number;
  action: string; // 'warning' | 'half_day_deduction' | 'full_day_deduction'
}

export interface OvertimeRateConfig {
  workingDay: number;
  weekend: number;
  holiday: number;
}

export interface AttendancePolicyData {
  id?: string;
  name?: string;
  trackingMethods?: ClockMethod[];
  graceMinutesLate?: number;
  graceMinutesEarly?: number;
  halfDayThresholdMinutes?: number;
  fullDayThresholdMinutes?: number;
  lateMarkRules?: LateMarkRule[];
  overtimeEnabled?: boolean;
  overtimeRates?: OvertimeRateConfig;
  maxOvertimePerDay?: number;
  maxOvertimePerWeek?: number;
  maxOvertimePerMonth?: number;
  overtimeApprovalType?: string;
  compOffConversionRules?: Record<string, unknown>;
  regularizationDeadlineDays?: number;
  regularizationApprovalRequired?: boolean;
  autoClockOut?: boolean;
  autoClockOutTime?: string;
  geoFenceEnabled?: boolean;
  wifiValidationEnabled?: boolean;
  allowedWifiNetworks?: string[];
  payrollCutoffDay?: number;
  lockAfterPayroll?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

// ─── Dashboard / Summary Types ──────────────────────────────────────────

export interface AttendanceDaySummary {
  date: string;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  totalWorkMinutes?: number;
  overtimeMinutes?: number;
  lateMinutes?: number;
  isHoliday?: boolean;
  holidayName?: string;
}

export interface AttendanceMonthlySummary {
  totalPresent: number;
  totalAbsent: number;
  totalHalfDays: number;
  totalLate: number;
  totalWfh: number;
  totalHolidays: number;
  totalWeekends: number;
  totalOvertimeMinutes: number;
  totalWorkMinutes: number;
  averageWorkMinutesPerDay: number;
  daysInMonth: number;
}

export interface TeamAttendanceSummary {
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  wfh: number;
  onBreak: number;
  notClockedIn: number;
}

export interface EmployeeAttendanceRow {
  employeeId: string;
  employeeName: string;
  department?: string;
  designation?: string;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  lateMinutes?: number;
  totalWorkMinutes?: number;
  shiftName?: string;
}

// ─── Reports ────────────────────────────────────────────────────────────

export interface AttendanceReportFilters {
  startDate: string;
  endDate: string;
  departmentId?: string;
  locationId?: string;
  employeeId?: string;
  status?: AttendanceStatus;
  shiftId?: string;
}

export interface OvertimeReportRow {
  employeeId: string;
  employeeName: string;
  department?: string;
  totalOvertimeMinutes: number;
  approvedRequests: number;
  pendingRequests: number;
  estimatedCost?: number;
}

export interface PunctualityScore {
  employeeId: string;
  totalDays: number;
  onTimeDays: number;
  lateDays: number;
  score: number; // percentage
  averageLateMinutes: number;
}

// ─── Integration Settings ───────────────────────────────────────────────

export interface BiometricDeviceConfig {
  id?: string;
  name: string;
  type: string; // 'fingerprint' | 'face' | 'nfc' | 'card'
  ipAddress?: string;
  port?: number;
  locationId?: string;
  syncFrequency?: string;
  isActive?: boolean;
  lastSyncAt?: string;
}

export interface IntegrationSettingsData {
  biometricDevices?: BiometricDeviceConfig[];
  geoFenceSettings?: {
    enabled: boolean;
    defaultRadius: number;
  };
  wifiSettings?: {
    enabled: boolean;
    networks: string[];
  };
  externalSystemSync?: {
    enabled: boolean;
    provider?: string;
    apiEndpoint?: string;
    syncFrequency?: string;
  };
}
