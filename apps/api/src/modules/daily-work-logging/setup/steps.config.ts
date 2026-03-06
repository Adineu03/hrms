import type { SetupStepDefinition } from '@hrms/shared';

export const DAILY_WORK_LOGGING_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'timesheet-policy',
    title: 'Timesheet Policy',
    description: 'Configure submission frequency, deadlines, minimum/maximum hours, rounding rules, and lock settings',
    required: true,
    order: 1,
  },
  {
    id: 'projects-tasks',
    title: 'Projects & Task Categories',
    description: 'Create and manage projects, define task categories, and configure billable settings',
    required: true,
    order: 2,
  },
  {
    id: 'approval-workflow',
    title: 'Approval Workflow',
    description: 'Set up multi-level approval chains, auto-approval rules, escalation and delegation policies',
    required: true,
    order: 3,
  },
  {
    id: 'review-activate',
    title: 'Review & Activate',
    description: 'Review your daily work logging configuration and activate the module',
    required: true,
    order: 4,
  },
];
