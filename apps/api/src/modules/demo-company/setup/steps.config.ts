import type { SetupStepDefinition } from '@hrms/shared';

export const DEMO_COMPANY_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'demo-org-setup',
    title: 'Demo Org Setup',
    description: 'Configure your demo sandbox — choose industry template and employee count',
    required: true,
    order: 1,
  },
  {
    id: 'seed-data-setup',
    title: 'Seed Data Setup',
    description: 'Select which modules to seed and configure the data date range',
    required: true,
    order: 2,
  },
  {
    id: 'demo-activate',
    title: 'Review & Activate',
    description: 'Review your demo configuration and go live',
    required: true,
    order: 3,
  },
];
