export type DashboardRole = 'admin' | 'manager' | 'employee';

export interface KpiValue {
  label: string;
  value: number;
  unit?: string; // '%', 'INR', 'days'
  delta?: number;
  deltaLabel?: string;
  spark?: number[];
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface NamedCount {
  name: string;
  value: number;
}

export interface ApprovalTypeCount {
  type: 'leave' | 'overtime' | 'timesheet' | 'expense';
  label: string;
  count: number;
  moduleId: string;
}

export interface ActivityItem {
  id: string;
  userName: string;
  action: string;
  entity: string;
  description: string | null;
  createdAt: string; // ISO
}

export interface ComplianceAlert {
  kind: 'document' | 'certification';
  name: string;
  employeeName: string;
  expiryDate: string;
  daysLeft: number;
  severity: 'expired' | 'critical' | 'warning';
}

export interface FunnelStage {
  stage: 'candidates' | 'applications' | 'interviews' | 'offers';
  count: number;
  byStatus?: Record<string, number>;
}

export interface ApprovalQueueItem {
  id: string;
  type: 'leave' | 'overtime' | 'timesheet' | 'expense';
  employeeName: string;
  detail: string;
  date: string;
  moduleId: string;
}

export interface OnLeaveItem {
  employeeName: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  status: 'approved' | 'pending';
  isCurrent: boolean;
}

export interface OneOnOneItem {
  id: string;
  employeeName: string;
  scheduledAt: string; // ISO
  duration: number;
}

export interface LeaveBalanceItem {
  leaveType: string;
  code: string;
  color: string | null;
  entitled: number;
  used: number;
  available: number;
}

export interface AttendancePoint {
  date: string;
  status: string;
  value: 0 | 0.5 | 1;
}

export interface MyRequestItem {
  id: string;
  type: 'leave' | 'self_service' | 'expense' | 'overtime';
  title: string;
  status: string;
  date: string;
}

export interface HolidayItem {
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

export interface GoalItem {
  id: string;
  title: string;
  status: string;
  progress: number;
  dueDate: string | null;
}

export interface RatingBucket {
  rating: '1' | '2' | '3' | '4' | '5' | 'pending';
  count: number;
}

export interface AttendanceDonut {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
}

interface OverviewBase {
  effectiveDate: string; // the dataset's "today" (YYYY-MM-DD)
  greetingName: string;
}

export interface AdminOverview extends OverviewBase {
  role: 'admin';
  kpis: {
    headcount: KpiValue;
    attendanceRate: KpiValue;
    pendingApprovals: KpiValue;
    monthlyPayrollCost: KpiValue;
  };
  charts: {
    headcountTrend: SeriesPoint[];
    departmentDistribution: NamedCount[];
  };
  widgets: {
    pendingApprovals: ApprovalTypeCount[];
    recentActivity: ActivityItem[];
    complianceAlerts: ComplianceAlert[];
    hiringFunnel: FunnelStage[];
  };
}

export interface ManagerOverview extends OverviewBase {
  role: 'manager';
  kpis: {
    teamSize: KpiValue;
    presentToday: KpiValue;
    myPendingApprovals: KpiValue;
    teamAvgRating: KpiValue;
  };
  charts: {
    teamAttendanceToday: AttendanceDonut;
    ratingDistribution: RatingBucket[];
  };
  widgets: {
    approvalsQueue: ApprovalQueueItem[];
    onLeave: OnLeaveItem[];
    upcomingOneOnOnes: OneOnOneItem[];
  };
}

export interface EmployeeOverview extends OverviewBase {
  role: 'employee';
  kpis: {
    leaveBalanceTotal: KpiValue;
    attendanceRateMTD: KpiValue;
    openGoals: KpiValue;
    lastPayslipNet: KpiValue;
  };
  charts: {
    leaveBalanceByType: LeaveBalanceItem[];
    myAttendanceTrend: AttendancePoint[];
  };
  widgets: {
    myRequests: MyRequestItem[];
    upcomingHolidays: HolidayItem[];
    goalsList: GoalItem[];
  };
}

export type DashboardOverviewResponse = AdminOverview | ManagerOverview | EmployeeOverview;
