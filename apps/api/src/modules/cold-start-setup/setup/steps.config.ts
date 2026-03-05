import type { SetupStepDefinition } from '@hrms/shared';

export const COLD_START_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'company-profile',
    title: 'Company Profile',
    description: 'Company name, legal details, logo, and brand color',
    required: true,
    order: 1,
  },
  {
    id: 'org-settings',
    title: 'Organization Settings',
    description: 'Country, currency, timezone, fiscal year, and date format',
    required: true,
    order: 2,
  },
  {
    id: 'work-week',
    title: 'Work Week Configuration',
    description: 'Configure working days and hours',
    required: true,
    order: 3,
  },
  {
    id: 'locations',
    title: 'Office Locations',
    description: 'Add your office locations and branches',
    required: false,
    order: 4,
  },
  {
    id: 'departments',
    title: 'Department Structure',
    description: 'Create your organization departments',
    required: true,
    order: 5,
  },
  {
    id: 'designations',
    title: 'Designation Hierarchy',
    description: 'Define job titles and role hierarchy',
    required: true,
    order: 6,
  },
  {
    id: 'grades',
    title: 'Grade & Level Structure',
    description: 'Define salary grades and bands',
    required: false,
    order: 7,
  },
  {
    id: 'invite-employees',
    title: 'Invite Employees',
    description: 'Invite employees via email or bulk import',
    required: false,
    order: 8,
  },
];
