import type { SetupStepDefinition } from '@hrms/shared';

export const ONBOARDING_OFFBOARDING_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'onboarding-workflow',
    title: 'Onboarding Workflow',
    description: 'Configure onboarding checklists, task types, owners, and deadlines per role and department',
    required: true,
    order: 1,
  },
  {
    id: 'offboarding-workflow',
    title: 'Offboarding Workflow',
    description: 'Set up exit checklists, asset return tracking, clearance workflows, and knowledge transfer templates',
    required: true,
    order: 2,
  },
  {
    id: 'document-templates',
    title: 'Document Templates',
    description: 'Upload and manage document templates for appointment letters, NDAs, policy acknowledgements, and compliance docs',
    required: true,
    order: 3,
  },
  {
    id: 'review-activate',
    title: 'Review & Activate',
    description: 'Review your onboarding & offboarding configuration and activate the module',
    required: true,
    order: 4,
  },
];
