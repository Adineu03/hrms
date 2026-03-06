import type { SetupStepDefinition } from '@hrms/shared';

export const LEARNING_DEVELOPMENT_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'lms-config',
    title: 'LMS Configuration',
    description: 'Configure SCORM/xAPI support, content formats, and compliance training mandates',
    required: true,
    order: 1,
  },
  {
    id: 'course-library-setup',
    title: 'Course Library Setup',
    description: 'Set up internal courses and configure external content partnerships (Udemy, Coursera, LinkedIn Learning)',
    required: true,
    order: 2,
  },
  {
    id: 'budget-setup',
    title: 'Budget Configuration',
    description: 'Configure L&D budget allocations per department, grade, and entity',
    required: true,
    order: 3,
  },
  {
    id: 'ld-activate',
    title: 'Review & Activate',
    description: 'Review configuration and activate the Learning & Development module',
    required: true,
    order: 4,
  },
];
