// Demo Company module types

export interface DemoOrgData {
  id: string;
  orgId: string;
  sandboxName: string;
  industryTemplate: string; // 'it-services'|'manufacturing'|'healthcare'|'retail'
  employeeCount: number; // 10|25|50
  status: string; // 'active'|'resetting'|'deleted'
  lastResetAt: string | null;
  seededModules: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DemoTourStep {
  order: number;
  targetSelector: string;
  tooltipText: string;
  title: string;
}

export interface DemoTourData {
  id: string;
  orgId: string;
  tourName: string;
  targetModule: string;
  assignedPersona: string; // 'admin'|'manager'|'employee'|'all'
  steps: DemoTourStep[];
  isPublished: boolean;
  completionCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DemoSessionData {
  id: string;
  orgId: string;
  sessionId: string;
  persona: string; // 'admin'|'manager'|'employee'
  startedAt: string;
  endedAt: string | null;
  modulesVisited: string[] | null;
  durationSeconds: number | null;
  converted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DemoPersonaInfo {
  persona: string; // 'admin'|'manager'|'employee'
  email: string;
  displayName: string;
  lastSessionAt: string | null;
  sessionCount: number;
  avgDurationSeconds: number | null;
}

export interface DemoAnalyticsSummary {
  demosStartedThisMonth: number;
  avgSessionLengthSeconds: number | null;
  topModules: { module: string; visitCount: number }[];
}

export interface DemoConversionFunnel {
  total: number;
  converted: number;
  conversionRate: number;
  stages: { label: string; count: number; percentage: number }[];
}

export interface SampleReport {
  id: string;
  name: string;
  description: string;
  type: string; // 'headcount'|'leave'|'attendance'|'performance'
  format: string; // 'csv'|'pdf'
}

export interface FeatureHighlight {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  iconName: string;
}
