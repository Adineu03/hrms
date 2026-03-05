export type SetupStatus = 'not_started' | 'in_progress' | 'completed';

export interface OrgModule {
  id: string;
  orgId: string;
  moduleId: string;
  isActive: boolean;
  setupStatus: SetupStatus;
  setupProgress: Record<string, any>;
  config: Record<string, any>;
  activatedAt: string | null;
  setupCompletedAt: string | null;
}

// Setup Engine types

export interface SetupStepDefinition {
  id: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
}

export interface SetupStepProgress {
  stepId: string;
  completed: boolean;
  completedAt: string | null;
}

export interface ModuleSetupInfo {
  moduleId: string;
  setupStatus: SetupStatus;
  steps: (SetupStepDefinition & { completed: boolean; completedAt: string | null })[];
  totalSteps: number;
  completedSteps: number;
}

// Module list API response — combines definition + org-specific status

export type ModuleActivationStatus = 'active' | 'inactive' | 'locked';

export interface ModuleWithStatus {
  id: string;
  name: string;
  phase: number;
  description: string;
  icon: string;
  dependencies: string[];
  activationStatus: ModuleActivationStatus;
  isActive: boolean;
  setupStatus: SetupStatus;
  setupProgress: number; // percentage 0-100
  canActivate: boolean;
  lockReason: string | null; // e.g. "Complete Core HR first"
}
