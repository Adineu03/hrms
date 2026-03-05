import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ne, count, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { SettingsDashboard, DataImportInfo } from '@hrms/shared';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { locations } from '../../../../infrastructure/database/schema/locations';
import { grades } from '../../../../infrastructure/database/schema/grades';
import { invitationTokens } from '../../../../infrastructure/database/schema/invitation-tokens';
import { dataImports } from '../../../../infrastructure/database/schema/data-imports';
import { orgs } from '../../../../infrastructure/database/schema/orgs';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getDashboard(orgId: string): Promise<SettingsDashboard> {
    // Count employees (users where orgId and role != super_admin)
    const [employeeResult] = await this.db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          eq(users.orgId, orgId),
          ne(users.role, 'super_admin'),
        ),
      );

    // Count departments
    const [departmentResult] = await this.db
      .select({ value: count() })
      .from(departments)
      .where(eq(departments.orgId, orgId));

    // Count active locations
    const [locationResult] = await this.db
      .select({ value: count() })
      .from(locations)
      .where(
        and(eq(locations.orgId, orgId), eq(locations.isActive, true)),
      );

    // Count grades
    const [gradeResult] = await this.db
      .select({ value: count() })
      .from(grades)
      .where(eq(grades.orgId, orgId));

    // Count pending invitations
    const [invitationResult] = await this.db
      .select({ value: count() })
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.orgId, orgId),
          eq(invitationTokens.status, 'pending'),
        ),
      );

    // Get recent imports (last 5)
    const recentImportRows = await this.db
      .select()
      .from(dataImports)
      .where(eq(dataImports.orgId, orgId))
      .orderBy(desc(dataImports.createdAt))
      .limit(5);

    const recentImports: DataImportInfo[] = recentImportRows.map((row) => ({
      id: row.id,
      type: row.type,
      fileName: row.fileName,
      status: row.status,
      totalRows: row.totalRows ?? 0,
      validRows: row.validRows ?? 0,
      errorRows: row.errorRows ?? 0,
      importedRows: row.importedRows ?? 0,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
    }));

    // Calculate setup completeness
    const setupCompleteness = await this.calculateSetupCompleteness(
      orgId,
      departmentResult.value,
      locationResult.value,
      gradeResult.value,
      employeeResult.value,
    );

    return {
      employeeCount: employeeResult.value,
      departmentCount: departmentResult.value,
      locationCount: locationResult.value,
      gradeCount: gradeResult.value,
      pendingInvitations: invitationResult.value,
      recentImports,
      setupCompleteness,
    };
  }

  private async calculateSetupCompleteness(
    orgId: string,
    departmentCount: number,
    locationCount: number,
    gradeCount: number,
    employeeCount: number,
  ): Promise<number> {
    let completedItems = 0;
    const totalItems = 8; // matches the 8 setup steps

    // 1. Company profile — check if org has config.companyProfile
    const [org] = await this.db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (org) {
      const config = (org.config as Record<string, any>) ?? {};
      if (config.companyProfile) completedItems++;
      if (config.orgSettings) completedItems++;
    }

    // 3. Work week — check orgModules config
    // (simplified: count it as done if orgSettings exists since work week is critical)
    // We'll check the org config for workWeek too
    if (org) {
      const config = (org.config as Record<string, any>) ?? {};
      if (config.workWeek) completedItems++;
    }

    // 4. Locations
    if (locationCount > 0) completedItems++;

    // 5. Departments
    if (departmentCount > 0) completedItems++;

    // 6. Designations — check if any exist
    const [designationResult] = await this.db
      .select({ value: count() })
      .from(schema.designations)
      .where(eq(schema.designations.orgId, orgId));
    if (designationResult.value > 0) completedItems++;

    // 7. Grades
    if (gradeCount > 0) completedItems++;

    // 8. Employees invited/added
    if (employeeCount > 0) completedItems++;

    return Math.round((completedItems / totalItems) * 100);
  }
}
