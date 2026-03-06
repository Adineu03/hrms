import type { SetupStepDefinition } from '@hrms/shared';

export const PAYROLL_PROCESSING_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'salary-components-setup',
    title: 'Salary Components Setup',
    description: 'Configure salary components (basic, HRA, DA, special allowances), pay grade mapping, and calculation rules',
    required: true,
    order: 1,
  },
  {
    id: 'tax-statutory-setup',
    title: 'Tax & Statutory Compliance',
    description: 'Configure tax regime (old/new), PF, ESI, PT, LWF rates, and statutory compliance settings',
    required: true,
    order: 2,
  },
  {
    id: 'payroll-calendar-setup',
    title: 'Payroll Calendar Setup',
    description: 'Set payroll cycle day, payment day, and processing schedule',
    required: true,
    order: 3,
  },
  {
    id: 'pp-activate',
    title: 'Review & Activate',
    description: 'Review payroll configuration and activate the Payroll Processing module',
    required: true,
    order: 4,
  },
];
