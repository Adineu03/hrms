import type { SetupStepDefinition } from '@hrms/shared';

export const LEAVE_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'leave-types',
    title: 'Leave Types',
    description: 'Define leave types such as casual, sick, earned, comp-off, maternity, paternity, and more',
    required: true,
    order: 1,
  },
  {
    id: 'leave-policy',
    title: 'Leave Policy',
    description: 'Configure accrual rules, carry-forward, sandwich rules, leave year, and approval settings',
    required: true,
    order: 2,
  },
  {
    id: 'approval-workflow',
    title: 'Approval Workflow',
    description: 'Set up multi-level approval chains, auto-approval rules, and escalation policies',
    required: true,
    order: 3,
  },
  {
    id: 'holiday-calendar',
    title: 'Holiday Calendar',
    description: 'Review and manage holiday calendar for leave calculation (shared with Attendance)',
    required: false,
    order: 4,
  },
  {
    id: 'review-activate',
    title: 'Review & Activate',
    description: 'Review your leave management configuration and activate the module',
    required: true,
    order: 5,
  },
];
