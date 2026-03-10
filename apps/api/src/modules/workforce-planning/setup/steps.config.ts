import type { SetupStepDefinition } from '@hrms/shared';

export const WORKFORCE_PLANNING_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'headcount-setup',
    title: 'Headcount Planning Setup',
    description: 'Configure headcount planning parameters, set baseline headcount targets per department',
    required: true,
    order: 1,
  },
  {
    id: 'roles-grades-setup',
    title: 'Roles & Grade Architecture',
    description: 'Define job families, grade bands, salary ranges, and role progressions',
    required: true,
    order: 2,
  },
  {
    id: 'wp-activate',
    title: 'Review & Activate',
    description: 'Review workforce planning configuration and activate the module',
    required: true,
    order: 3,
  },
];
