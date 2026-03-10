import type { SetupStepDefinition } from '@hrms/shared';

export const COMPLIANCE_AUDIT_SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: 'compliance-policies-setup',
    title: 'Compliance Policies Setup',
    description: 'Configure your compliance policy library, add policy templates, and set acknowledgment requirements',
    required: true,
    order: 1,
  },
  {
    id: 'audit-trail-setup',
    title: 'Audit Trail Configuration',
    description: 'Configure what entities to track, set retention policies per data type, and enable audit logging',
    required: true,
    order: 2,
  },
  {
    id: 'ca-activate',
    title: 'Review & Activate',
    description: 'Review compliance & audit configuration and activate the module',
    required: true,
    order: 3,
  },
];
