import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamSuccessionDashboardService } from './team-succession-dashboard.service';

@Roles('manager', 'super_admin', 'admin')
@Controller('workforce-planning/manager/team-succession')
export class TeamSuccessionDashboardController {
  constructor(
    private readonly service: TeamSuccessionDashboardService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getTeamSuccession() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTeamSuccession(orgId);
  }

  @Get('bench-strength')
  async getBenchStrength() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getBenchStrength(orgId);
  }
}
