import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { ModuleSetupInfo } from '@hrms/shared';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { orgModules } from '../../infrastructure/database/schema/org-modules';
import { SetupStepRegistry } from './setup-step.registry';

@Injectable()
export class SetupEngineService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly stepRegistry: SetupStepRegistry,
  ) {}

  async getSetupInfo(orgId: string, moduleId: string): Promise<ModuleSetupInfo> {
    // Get step definitions from registry
    if (!this.stepRegistry.hasSteps(moduleId)) {
      throw new NotFoundException(`No setup steps registered for module '${moduleId}'`);
    }

    const stepDefs = this.stepRegistry.getSteps(moduleId);

    // Get org_module row
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Module '${moduleId}' not found for this organization`);
    }

    const progress = (row.setupProgress as Record<string, any>) ?? {};

    // Merge step definitions with progress
    const steps = stepDefs
      .sort((a, b) => a.order - b.order)
      .map((def) => {
        const stepProgress = progress[def.id] as
          | { completed: boolean; completedAt: string }
          | undefined;
        return {
          ...def,
          completed: stepProgress?.completed ?? false,
          completedAt: stepProgress?.completedAt ?? null,
        };
      });

    const completedSteps = steps.filter((s) => s.completed).length;

    return {
      moduleId,
      setupStatus: row.setupStatus,
      steps,
      totalSteps: steps.length,
      completedSteps,
    };
  }

  async completeStep(
    orgId: string,
    moduleId: string,
    stepId: string,
  ): Promise<ModuleSetupInfo> {
    // Validate step exists in registry
    if (!this.stepRegistry.hasSteps(moduleId)) {
      throw new NotFoundException(`No setup steps registered for module '${moduleId}'`);
    }

    const stepDefs = this.stepRegistry.getSteps(moduleId);
    const stepDef = stepDefs.find((s) => s.id === stepId);
    if (!stepDef) {
      throw new NotFoundException(
        `Step '${stepId}' not found for module '${moduleId}'`,
      );
    }

    // Get org_module row
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Module '${moduleId}' not found for this organization`);
    }

    // Update setupProgress
    const progress = (row.setupProgress as Record<string, any>) ?? {};
    progress[stepId] = {
      completed: true,
      completedAt: new Date().toISOString(),
    };

    // Determine new setupStatus
    const newStatus = row.setupStatus === 'not_started' ? 'in_progress' : row.setupStatus;

    const now = new Date();
    await this.db
      .update(orgModules)
      .set({
        setupProgress: progress,
        setupStatus: newStatus,
        updatedAt: now,
      })
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)));

    return this.getSetupInfo(orgId, moduleId);
  }

  async completeSetup(orgId: string, moduleId: string): Promise<void> {
    // Validate steps exist
    if (!this.stepRegistry.hasSteps(moduleId)) {
      throw new NotFoundException(`No setup steps registered for module '${moduleId}'`);
    }

    const stepDefs = this.stepRegistry.getSteps(moduleId);

    // Get org_module row
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Module '${moduleId}' not found for this organization`);
    }

    // Validate all required steps are complete
    const progress = (row.setupProgress as Record<string, any>) ?? {};
    const requiredSteps = stepDefs.filter((s) => s.required);

    const incompleteRequired = requiredSteps.filter((s) => {
      const stepProgress = progress[s.id] as
        | { completed: boolean }
        | undefined;
      return !stepProgress?.completed;
    });

    if (incompleteRequired.length > 0) {
      const missing = incompleteRequired.map((s) => s.title).join(', ');
      throw new BadRequestException(
        `Cannot complete setup. Required steps not finished: ${missing}`,
      );
    }

    // Mark setup as completed
    const now = new Date();
    await this.db
      .update(orgModules)
      .set({
        setupStatus: 'completed',
        setupCompletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)));
  }
}
