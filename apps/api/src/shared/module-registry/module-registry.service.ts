import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { MODULES, MODULE_LIST } from '@hrms/shared';
import type {
  ModuleWithStatus,
  ModuleActivationStatus,
  OrgModule,
  SetupStatus,
} from '@hrms/shared';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { orgModules } from '../../infrastructure/database/schema/org-modules';

@Injectable()
export class ModuleRegistryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listModules(orgId: string): Promise<ModuleWithStatus[]> {
    const rows = await this.db
      .select()
      .from(orgModules)
      .where(eq(orgModules.orgId, orgId));

    // Build a lookup map from moduleId -> org_modules row
    const rowMap = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      rowMap.set(row.moduleId, row);
    }

    // Build a set of modules that are active AND setup completed (for dependency checks)
    const completedModuleIds = new Set<string>();
    for (const row of rows) {
      if (row.isActive && row.setupStatus === 'completed') {
        completedModuleIds.add(row.moduleId);
      }
    }

    // Build a set of active modules (for dependency checks — active regardless of setup status)
    const activeModuleIds = new Set<string>();
    for (const row of rows) {
      if (row.isActive) {
        activeModuleIds.add(row.moduleId);
      }
    }

    return MODULE_LIST.map((def) => {
      const row = rowMap.get(def.id);
      const isActive = row?.isActive ?? false;
      const setupStatus: SetupStatus = (row?.setupStatus as SetupStatus) ?? 'not_started';
      const setupProgress = row?.setupProgress as Record<string, any> | null;

      // Calculate setup progress percentage
      let progressPercent = 0;
      if (setupProgress && typeof setupProgress === 'object') {
        const stepEntries = Object.values(setupProgress);
        const total = stepEntries.length;
        if (total > 0) {
          const completed = stepEntries.filter(
            (s: any) => s && s.completed === true,
          ).length;
          progressPercent = Math.round((completed / total) * 100);
        }
      }
      if (setupStatus === 'completed') {
        progressPercent = 100;
      }

      // Determine activation status and canActivate
      const depsAreSatisfied = def.dependencies.every((depId) =>
        completedModuleIds.has(depId),
      );

      let activationStatus: ModuleActivationStatus;
      let canActivate = false;
      let lockReason: string | null = null;

      if (isActive) {
        activationStatus = 'active';
        canActivate = false; // already active
      } else if (!depsAreSatisfied) {
        activationStatus = 'locked';
        canActivate = false;
        const missingDeps = def.dependencies
          .filter((depId) => !completedModuleIds.has(depId))
          .map((depId) => MODULES[depId]?.name ?? depId);
        lockReason = `Complete ${missingDeps.join(', ')} first`;
      } else {
        activationStatus = 'inactive';
        canActivate = true;
      }

      return {
        id: def.id,
        name: def.name,
        phase: def.phase,
        description: def.description,
        icon: def.icon,
        dependencies: def.dependencies,
        activationStatus,
        isActive,
        setupStatus,
        setupProgress: progressPercent,
        canActivate,
        lockReason,
      };
    });
  }

  async activateModule(orgId: string, moduleId: string): Promise<OrgModule> {
    // Validate module exists in definitions
    const moduleDef = MODULES[moduleId];
    if (!moduleDef) {
      throw new NotFoundException(`Module '${moduleId}' does not exist`);
    }

    // Get the org_module row
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Module '${moduleId}' not found for this organization`);
    }

    if (row.isActive) {
      throw new BadRequestException(`Module '${moduleId}' is already active`);
    }

    // Check dependencies: all deps must be active AND setup completed
    if (moduleDef.dependencies.length > 0) {
      const depRows = await this.db
        .select()
        .from(orgModules)
        .where(eq(orgModules.orgId, orgId));

      const depMap = new Map<string, typeof depRows[number]>();
      for (const r of depRows) {
        depMap.set(r.moduleId, r);
      }

      for (const depId of moduleDef.dependencies) {
        const depRow = depMap.get(depId);
        if (!depRow || !depRow.isActive || depRow.setupStatus !== 'completed') {
          const depName = MODULES[depId]?.name ?? depId;
          throw new BadRequestException(
            `Dependency '${depName}' must be active and setup completed before activating '${moduleDef.name}'`,
          );
        }
      }
    }

    // Activate the module
    const now = new Date();
    const [updated] = await this.db
      .update(orgModules)
      .set({
        isActive: true,
        activatedAt: now,
        setupStatus: 'in_progress',
        updatedAt: now,
      })
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)))
      .returning();

    return {
      id: updated.id,
      orgId: updated.orgId,
      moduleId: updated.moduleId,
      isActive: updated.isActive,
      setupStatus: updated.setupStatus,
      setupProgress: (updated.setupProgress as Record<string, any>) ?? {},
      config: (updated.config as Record<string, any>) ?? {},
      activatedAt: updated.activatedAt?.toISOString() ?? null,
      setupCompletedAt: updated.setupCompletedAt?.toISOString() ?? null,
    };
  }

  async deactivateModule(orgId: string, moduleId: string): Promise<void> {
    // Validate module exists in definitions
    const moduleDef = MODULES[moduleId];
    if (!moduleDef) {
      throw new NotFoundException(`Module '${moduleId}' does not exist`);
    }

    // Get the org_module row
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Module '${moduleId}' not found for this organization`);
    }

    if (!row.isActive) {
      throw new BadRequestException(`Module '${moduleId}' is not active`);
    }

    // Check that no other active modules depend on this one
    const allRows = await this.db
      .select()
      .from(orgModules)
      .where(eq(orgModules.orgId, orgId));

    const dependentModules: string[] = [];
    for (const r of allRows) {
      if (r.isActive && r.moduleId !== moduleId) {
        const rDef = MODULES[r.moduleId];
        if (rDef && rDef.dependencies.includes(moduleId)) {
          dependentModules.push(rDef.name);
        }
      }
    }

    if (dependentModules.length > 0) {
      throw new BadRequestException(
        `Cannot deactivate '${moduleDef.name}' because these modules depend on it: ${dependentModules.join(', ')}`,
      );
    }

    // Deactivate the module
    const now = new Date();
    await this.db
      .update(orgModules)
      .set({
        isActive: false,
        activatedAt: null,
        updatedAt: now,
      })
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)));
  }
}
