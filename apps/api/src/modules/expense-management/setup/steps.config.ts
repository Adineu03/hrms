import type { SetupStepDefinition } from '@hrms/shared';

export const EXPENSE_MANAGEMENT_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'expense-categories-setup',
    title: 'Expense Categories Setup',
    description: 'Configure expense categories such as travel, meals, accommodation, office supplies, and client entertainment',
    required: true,
    order: 1,
  },
  {
    id: 'expense-policy-setup',
    title: 'Expense Policy Configuration',
    description: 'Set spending limits by role/grade/department, receipt requirements, per diem rates, and approval workflows',
    required: true,
    order: 2,
  },
  {
    id: 'em-activate',
    title: 'Review & Activate',
    description: 'Review expense management configuration and activate the module',
    required: true,
    order: 3,
  },
];
