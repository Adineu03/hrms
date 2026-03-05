import { Injectable } from '@nestjs/common';
import type { SetupStepDefinition } from '@hrms/shared';

@Injectable()
export class SetupStepRegistry {
  private registry = new Map<string, SetupStepDefinition[]>();

  register(moduleId: string, steps: SetupStepDefinition[]): void {
    this.registry.set(moduleId, steps);
  }

  getSteps(moduleId: string): SetupStepDefinition[] {
    return this.registry.get(moduleId) ?? [];
  }

  hasSteps(moduleId: string): boolean {
    return this.registry.has(moduleId);
  }
}
