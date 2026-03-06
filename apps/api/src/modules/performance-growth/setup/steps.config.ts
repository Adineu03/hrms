import type { SetupStepDefinition } from '@hrms/shared';

export const PERFORMANCE_GROWTH_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'review-cycle-config',
    title: 'Review Cycle Configuration',
    description: 'Define review periods, types, rating scales, and component weightage',
    required: true,
    order: 1,
  },
  {
    id: 'goal-framework',
    title: 'Goal Framework Setup',
    description: 'Configure goal categories, OKR/KPI framework, and measurement criteria',
    required: true,
    order: 2,
  },
  {
    id: 'competency-library',
    title: 'Competency Library',
    description: 'Create competency definitions with proficiency levels and role mappings',
    required: true,
    order: 3,
  },
  {
    id: 'review-activate',
    title: 'Review & Activate',
    description: 'Review configuration and activate the Performance & Growth module',
    required: true,
    order: 4,
  },
];
