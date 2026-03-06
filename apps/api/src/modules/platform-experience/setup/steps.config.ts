import type { SetupStepDefinition } from '@hrms/shared';

export const PLATFORM_EXPERIENCE_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'notification-config',
    title: 'Notification Configuration',
    description: 'Configure notification channels (email, push, in-app, SMS), alert rules, and delivery preferences',
    required: true,
    order: 1,
  },
  {
    id: 'customization-setup',
    title: 'Platform Customization',
    description: 'Set up theme & branding, custom fields, and dashboard widget configuration',
    required: true,
    order: 2,
  },
  {
    id: 'search-nav-setup',
    title: 'Search & Navigation',
    description: 'Configure global search, navigation menus, quick-access shortcuts, and module visibility',
    required: true,
    order: 3,
  },
  {
    id: 'pe-activate',
    title: 'Review & Activate',
    description: 'Review configuration and activate the Platform & Experience module',
    required: true,
    order: 4,
  },
];
