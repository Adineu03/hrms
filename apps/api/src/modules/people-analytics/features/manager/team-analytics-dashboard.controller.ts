import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamAnalyticsDashboardService } from './team-analytics-dashboard.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('people-analytics/manager/team-analytics-dashboard')
export class TeamAnalyticsDashboardController {
  constructor(
    private readonly service: TeamAnalyticsDashboardService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async getDashboard() {
    return this.service.getDashboard(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
