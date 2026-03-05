import type { SetupStepDefinition } from '@hrms/shared';

export const ATTENDANCE_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'shift-types',
    title: 'Shift Types',
    description: 'Define shift types with timings, break windows, and grace periods for your organization',
    required: true,
    order: 1,
  },
  {
    id: 'attendance-policy',
    title: 'Attendance Policy',
    description: 'Configure tracking methods, late/half-day rules, and regularization settings',
    required: true,
    order: 2,
  },
  {
    id: 'overtime-rules',
    title: 'Overtime Rules',
    description: 'Set overtime eligibility, rates, limits, and approval workflows',
    required: false,
    order: 3,
  },
  {
    id: 'holiday-calendar',
    title: 'Holiday Calendar',
    description: 'Add national, regional, and organization-specific holidays for the year',
    required: true,
    order: 4,
  },
  {
    id: 'review-activate',
    title: 'Review & Activate',
    description: 'Review your attendance configuration and activate the module',
    required: true,
    order: 5,
  },
];
