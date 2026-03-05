import type { SetupStepDefinition } from '@hrms/shared';

export interface SetupStepConfig {
  moduleId: string;
  steps: SetupStepDefinition[];
}
