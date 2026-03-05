export interface ModuleDefinition {
  id: string;
  name: string;
  phase: number;
  description: string;
  dependencies: string[];
  icon: string;
}

export const MODULES: Record<string, ModuleDefinition> = {
  'cold-start-setup': {
    id: 'cold-start-setup',
    name: 'Cold Start & Setup',
    phase: 1,
    description: 'First-time org onboarding & configuration',
    dependencies: [],
    icon: 'Rocket',
  },
  'core-hr': {
    id: 'core-hr',
    name: 'Core HR & People Data',
    phase: 2,
    description: 'Employee directory, departments, hierarchy',
    dependencies: ['cold-start-setup'],
    icon: 'Users',
  },
  'attendance': {
    id: 'attendance',
    name: 'Time & Attendance',
    phase: 3,
    description: 'Clock in/out, shifts, overtime',
    dependencies: ['core-hr'],
    icon: 'Clock',
  },
  'leave-management': {
    id: 'leave-management',
    name: 'Leave Management',
    phase: 4,
    description: 'Leave types, policies, approvals',
    dependencies: ['core-hr'],
    icon: 'CalendarOff',
  },
  'daily-work-logging': {
    id: 'daily-work-logging',
    name: 'Daily Work Logging',
    phase: 5,
    description: 'Timesheets, task logs, activity tracking',
    dependencies: ['core-hr'],
    icon: 'ClipboardList',
  },
  'talent-acquisition': {
    id: 'talent-acquisition',
    name: 'Talent Acquisition',
    phase: 6,
    description: 'Recruitment, job postings, ATS',
    dependencies: [],
    icon: 'UserPlus',
  },
  'onboarding-offboarding': {
    id: 'onboarding-offboarding',
    name: 'Onboarding & Offboarding',
    phase: 7,
    description: 'Joining, exit, handover workflows',
    dependencies: ['core-hr'],
    icon: 'ArrowRightLeft',
  },
  'performance-growth': {
    id: 'performance-growth',
    name: 'Performance & Growth',
    phase: 8,
    description: 'Reviews, goals, feedback cycles',
    dependencies: ['core-hr'],
    icon: 'TrendingUp',
  },
  'learning-development': {
    id: 'learning-development',
    name: 'Learning & Development',
    phase: 9,
    description: 'Courses, certifications, skill gaps',
    dependencies: ['core-hr'],
    icon: 'GraduationCap',
  },
  'compensation-rewards': {
    id: 'compensation-rewards',
    name: 'Compensation & Rewards',
    phase: 10,
    description: 'Salary structure, bonuses, recognition',
    dependencies: ['core-hr'],
    icon: 'Trophy',
  },
  'engagement-culture': {
    id: 'engagement-culture',
    name: 'Engagement & Culture',
    phase: 11,
    description: 'Surveys, polls, wellness, social feed',
    dependencies: ['core-hr'],
    icon: 'Heart',
  },
  'platform-experience': {
    id: 'platform-experience',
    name: 'Platform & Experience Layer',
    phase: 12,
    description: 'Notifications, search, customization',
    dependencies: [],
    icon: 'Layout',
  },
  'payroll-processing': {
    id: 'payroll-processing',
    name: 'Payroll Processing',
    phase: 13,
    description: 'Salary computation, tax, payslips',
    dependencies: ['core-hr'],
    icon: 'Wallet',
  },
  'expense-management': {
    id: 'expense-management',
    name: 'Expense Management',
    phase: 14,
    description: 'Claims, receipts, reimbursements',
    dependencies: ['core-hr'],
    icon: 'Receipt',
  },
  'compliance-audit': {
    id: 'compliance-audit',
    name: 'Compliance & Audit',
    phase: 15,
    description: 'Statutory compliance, audit trails',
    dependencies: ['core-hr'],
    icon: 'ShieldCheck',
  },
  'workforce-planning': {
    id: 'workforce-planning',
    name: 'Workforce Planning',
    phase: 16,
    description: 'Headcount, budgets, org design',
    dependencies: ['core-hr'],
    icon: 'Network',
  },
  'integrations-api': {
    id: 'integrations-api',
    name: 'Integrations & API Platform',
    phase: 17,
    description: 'Third-party connectors, API gateway',
    dependencies: [],
    icon: 'Plug',
  },
  'people-analytics': {
    id: 'people-analytics',
    name: 'People Analytics & BI',
    phase: 18,
    description: 'Dashboards, reports, predictive insights',
    dependencies: ['core-hr'],
    icon: 'BarChart3',
  },
  'demo-company': {
    id: 'demo-company',
    name: 'Demo Company Feature',
    phase: 19,
    description: 'Sandbox demo org with seeded data',
    dependencies: [],
    icon: 'FlaskConical',
  },
};

export const MODULE_LIST = Object.values(MODULES).sort((a, b) => a.phase - b.phase);

export function getModuleDependencies(moduleId: string): string[] {
  const module = MODULES[moduleId];
  if (!module) return [];
  return module.dependencies;
}

export function canActivateModule(moduleId: string, completedModules: string[]): boolean {
  const deps = getModuleDependencies(moduleId);
  return deps.every((dep) => completedModules.includes(dep));
}
