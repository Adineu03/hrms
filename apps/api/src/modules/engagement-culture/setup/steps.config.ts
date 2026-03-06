import type { SetupStepDefinition } from '@hrms/shared';

export const ENGAGEMENT_CULTURE_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'survey-config',
    title: 'Survey & Pulse Configuration',
    description: 'Configure engagement survey templates, pulse check frequency, and anonymous feedback settings',
    required: true,
    order: 1,
  },
  {
    id: 'culture-values-setup',
    title: 'Culture & Values Setup',
    description: 'Define company values, culture pillars, and value-based recognition integration',
    required: true,
    order: 2,
  },
  {
    id: 'wellness-setup',
    title: 'Wellness Program Setup',
    description: 'Configure wellness initiatives, mental health resources, fitness challenges, and wellness budget',
    required: true,
    order: 3,
  },
  {
    id: 'ec-activate',
    title: 'Review & Activate',
    description: 'Review configuration and activate the Engagement & Culture module',
    required: true,
    order: 4,
  },
];
