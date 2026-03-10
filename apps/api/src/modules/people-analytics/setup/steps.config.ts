import type { SetupStepDefinition } from '@hrms/shared';

export const PEOPLE_ANALYTICS_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'dashboard-setup',
    title: 'Dashboard Setup',
    description: 'Configure your default KPI dashboard — choose which metrics appear on the org-level overview',
    required: true,
    order: 1,
  },
  {
    id: 'kpi-setup',
    title: 'KPI & Metrics Setup',
    description: 'Define custom KPIs and set target values for your organization',
    required: true,
    order: 2,
  },
  {
    id: 'analytics-activate',
    title: 'Review & Activate',
    description: 'Review your analytics configuration and activate the module',
    required: true,
    order: 3,
  },
];
