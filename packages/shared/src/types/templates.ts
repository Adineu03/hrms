// Industry Template types

export interface WorkWeekConfig {
  days: string[]; // e.g. ['Mon','Tue','Wed','Thu','Fri']
  startTime: string; // e.g. '09:00'
  endTime: string; // e.g. '18:00'
  timezone: string; // e.g. 'Asia/Kolkata'
}

export interface LeaveConfig {
  casual: number;
  sick: number;
  earned: number;
  wfh: boolean;
}

export interface AttendanceConfig {
  flexiHours: boolean;
  remoteEnabled: boolean;
  graceMinutes: number;
}

export interface PayrollConfig {
  taxRegime: string;
  ctcBased: boolean;
  currency: string;
}

export interface ProbationConfig {
  months: number;
  noticePeriodDays: number;
}

export interface DepartmentTemplate {
  name: string;
  children?: DepartmentTemplate[];
}

export interface DesignationTemplate {
  name: string;
  level: number;
  department?: string;
}

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  workWeek: WorkWeekConfig;
  leave: LeaveConfig;
  attendance: AttendanceConfig;
  payroll: PayrollConfig;
  probation: ProbationConfig;
  departments: DepartmentTemplate[];
  designations: DesignationTemplate[];
}

export interface IndustryTemplateSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Cold Start step data types

export interface CompanyProfileData {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  website?: string;
}

export interface WorkWeekData {
  days: string[];
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface DepartmentData {
  id?: string;
  name: string;
  parentId?: string | null;
}

export interface DesignationData {
  id?: string;
  name: string;
  level: number;
  departmentId?: string | null;
}

export interface InviteEmployeesData {
  emails: string[];
}
