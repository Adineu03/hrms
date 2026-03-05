import type { SetupStepDefinition } from '@hrms/shared';

export const COLD_START_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'company-profile',
    title: 'Company Profile',
    description: 'Set up company name, logo, and address',
    required: true,
    order: 1,
  },
  {
    id: 'work-week',
    title: 'Work Week Configuration',
    description: 'Configure working days and hours',
    required: true,
    order: 2,
  },
  {
    id: 'departments',
    title: 'Department Structure',
    description: 'Create your organization departments',
    required: true,
    order: 3,
  },
  {
    id: 'designations',
    title: 'Designation Hierarchy',
    description: 'Define job titles and role hierarchy',
    required: true,
    order: 4,
  },
  {
    id: 'invite-employees',
    title: 'Invite Employees',
    description: 'Invite your first employees to the platform',
    required: false,
    order: 5,
  },
];
