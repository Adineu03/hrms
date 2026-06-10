import { Controller, Get, Inject, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';

/**
 * Small lookup endpoints used by the onboarding-offboarding admin dashboards
 * (e.g. the department dropdown in the workflow builder modal).
 */
@Controller('onboarding-offboarding/admin')
export class AdminLookupsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('departments')
  @Roles('super_admin', 'admin')
  async listDepartments() {
    const orgId = this.getOrgIdOrThrow();
    const rows = await this.db
      .select({ id: schema.departments.id, name: schema.departments.name })
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId))
      .orderBy(schema.departments.name);
    return { data: rows };
  }
}
