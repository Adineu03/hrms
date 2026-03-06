import type { SetupStepDefinition } from '@hrms/shared';

export const COMPENSATION_REWARDS_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'salary-structure-config',
    title: 'Salary Structure Configuration',
    description: 'Configure grade/level-based pay bands, CTC composition, and statutory compliance settings',
    required: true,
    order: 1,
  },
  {
    id: 'rewards-program-setup',
    title: 'Rewards & Recognition Setup',
    description: 'Configure recognition programs, nomination workflows, and points-based reward system',
    required: true,
    order: 2,
  },
  {
    id: 'benefits-config',
    title: 'Benefits Configuration',
    description: 'Set up flexible benefits plans, insurance options, and reimbursement categories',
    required: true,
    order: 3,
  },
  {
    id: 'cr-activate',
    title: 'Review & Activate',
    description: 'Review configuration and activate the Compensation & Rewards module',
    required: true,
    order: 4,
  },
];
