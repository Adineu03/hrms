import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { orgModules } from '../../infrastructure/database/schema/org-modules';

import * as coldStartDefaults from '../../templates/module-defaults/cold-start.defaults.json';
import * as coreHrDefaults from '../../templates/module-defaults/core-hr.defaults.json';
import * as leaveDefaults from '../../templates/module-defaults/leave.defaults.json';
import * as attendanceDefaults from '../../templates/module-defaults/attendance.defaults.json';
import * as payrollDefaults from '../../templates/module-defaults/payroll.defaults.json';

interface ModuleDefaultsFile {
  moduleId: string;
  defaults: Record<string, any>;
}

@Injectable()
export class DefaultsService {
  private readonly defaults: Map<string, Record<string, any>>;

  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    this.defaults = new Map<string, Record<string, any>>();

    const allDefaults: ModuleDefaultsFile[] = [
      coldStartDefaults as ModuleDefaultsFile,
      coreHrDefaults as ModuleDefaultsFile,
      leaveDefaults as ModuleDefaultsFile,
      attendanceDefaults as ModuleDefaultsFile,
      payrollDefaults as ModuleDefaultsFile,
    ];

    for (const file of allDefaults) {
      this.defaults.set(file.moduleId, file.defaults);
    }
  }

  getDefaults(moduleId: string): Record<string, any> | null {
    return this.defaults.get(moduleId) ?? null;
  }

  async applyDefaults(orgId: string, moduleId: string): Promise<Record<string, any>> {
    const moduleDefaults = this.defaults.get(moduleId);
    if (!moduleDefaults) {
      throw new NotFoundException(`No defaults found for module '${moduleId}'`);
    }

    // Get current org_module config
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(
        and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Module '${moduleId}' not found for this organization`);
    }

    const existingConfig = (row.config as Record<string, any>) ?? {};

    // Merge: defaults as base, existing config overrides (admin always wins)
    const mergedConfig = this.deepMerge(moduleDefaults, existingConfig);

    const now = new Date();
    await this.db
      .update(orgModules)
      .set({
        config: mergedConfig,
        updatedAt: now,
      })
      .where(
        and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, moduleId)),
      );

    return mergedConfig;
  }

  /**
   * Deep merge two objects. Values from `override` take precedence over `base`.
   * Arrays are replaced (not concatenated).
   */
  private deepMerge(
    base: Record<string, any>,
    override: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = { ...base };

    for (const key of Object.keys(override)) {
      if (
        override[key] !== null &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.deepMerge(result[key], override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }
}
