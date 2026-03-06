import type { SetupStepDefinition } from '@hrms/shared';

export const TALENT_ACQUISITION_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'recruitment-pipeline',
    title: 'Recruitment Pipeline',
    description: 'Configure hiring stages, evaluation criteria, scorecards, and SLA per stage',
    required: true,
    order: 1,
  },
  {
    id: 'job-templates',
    title: 'Job Templates & Posting',
    description: 'Set up job description templates, posting channels, and careers page configuration',
    required: true,
    order: 2,
  },
  {
    id: 'offer-templates',
    title: 'Offer Templates & Approval',
    description: 'Configure offer letter templates, approval workflows, and compensation bands',
    required: true,
    order: 3,
  },
  {
    id: 'review-activate',
    title: 'Review & Activate',
    description: 'Review your talent acquisition configuration and activate the module',
    required: true,
    order: 4,
  },
];
