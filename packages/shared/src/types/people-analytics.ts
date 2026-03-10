// People Analytics & BI module types

export interface AnalyticsReportData {
  id: string;
  name: string;
  description: string | null;
  reportType: string; // 'bar' | 'line' | 'pie' | 'table'
  sourceModules: string[];
  selectedFields: Record<string, unknown>;
  filters: Record<string, unknown> | null;
  schedule: { frequency: string; deliveryEmail: string; format: string } | null;
  isShared: boolean;
  createdBy: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsDashboardData {
  id: string;
  name: string;
  dashboardType: string; // 'org' | 'team' | 'personal'
  widgets: { metricKey: string; label: string; position: number }[];
  filters: Record<string, unknown> | null;
  isDefault: boolean;
  ownerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsKpiData {
  id: string;
  name: string;
  formula: string;
  description: string | null;
  unit: string | null;
  targetValue: number | null;
  thresholdLow: number | null;
  thresholdHigh: number | null;
  alertEnabled: boolean;
  scope: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgKpiSummary {
  headcount: number;
  attritionRate: number;
  openRoles: number;
  avgTenureMonths: number;
  departments: unknown[];
}

export interface WorkforceAttritionData {
  voluntary: number;
  involuntary: number;
  regrettable: number;
  trend: unknown[];
}

export interface TeamAnalyticsSummary {
  headcount: number;
  attritionRate: number;
  leaveUtilization: number;
  attendanceRate: number;
  performanceDistribution: {
    outstanding: number;
    exceedsExpectations: number;
    meetsExpectations: number;
    needsImprovement: number;
  };
}

export interface EmployeeAnalyticsSummary {
  leaveBalance: number;
  attendanceRate: number;
  performanceScore: number;
  tenureMonths: number;
  trainingHoursCompleted: number;
  attendanceTrend: unknown[];
  leaveUsage: unknown[];
  careerMilestones: unknown[];
}

export interface PeerBenchmarkData {
  attendance: { mine: number; deptAvg: number; difference: string };
  leaveUtilization: { mine: number; deptAvg: number; difference: string };
  performanceScore: { mine: number; deptAvg: number; difference: string };
  note: string;
}
