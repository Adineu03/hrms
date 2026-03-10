import type { SetupStepDefinition } from '@hrms/shared';

export const INTEGRATIONS_API_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'connector-setup',
    title: 'Connector Setup',
    description: 'Enable the integrations you need — payroll connectors, communication tools, ERP systems, and more',
    required: true,
    order: 1,
  },
  {
    id: 'api-keys-setup',
    title: 'API Keys Setup',
    description: 'Generate your first API key and configure rate limits and IP whitelisting for secure external access',
    required: true,
    order: 2,
  },
  {
    id: 'integrations-activate',
    title: 'Review & Activate',
    description: 'Review your integration configuration and activate the module',
    required: true,
    order: 3,
  },
];
