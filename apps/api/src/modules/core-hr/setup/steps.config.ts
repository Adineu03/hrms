import type { SetupStepDefinition } from '@hrms/shared';

export const CORE_HR_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'employee-id-format',
    title: 'Employee ID Format',
    description: 'Configure auto-generated employee ID format (e.g., EMP-0001)',
    required: true,
    order: 1,
  },
  {
    id: 'probation-notice-policy',
    title: 'Probation & Notice Period',
    description: 'Set default probation duration and notice period for your organization',
    required: true,
    order: 2,
  },
  {
    id: 'document-types',
    title: 'Document Types',
    description: 'Configure required and optional document types for employees',
    required: false,
    order: 3,
  },
  {
    id: 'custom-fields',
    title: 'Custom Fields',
    description: 'Add custom fields for employee profiles (country-specific, industry-specific)',
    required: false,
    order: 4,
  },
  {
    id: 'review-activate',
    title: 'Review & Activate',
    description: 'Review your Core HR configuration and activate the module',
    required: true,
    order: 5,
  },
];
