import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OrgDesignStudioService } from './org-design-studio.service';

@Roles('super_admin', 'admin')
@Controller('workforce-planning/admin/org-design-studio')
export class OrgDesignStudioController {
  constructor(
    private readonly service: OrgDesignStudioService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('summary')
  async getOrgSummary() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getOrgSummary(orgId);
  }

  @Get('headcount-by-dept')
  async getHeadcountByDept() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getHeadcountByDept(orgId);
  }

  @Get('span-of-control')
  async getSpanOfControl() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSpanOfControl(orgId);
  }

  @Get('scenarios')
  async listScenarios() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listScenarios(orgId);
  }
}
