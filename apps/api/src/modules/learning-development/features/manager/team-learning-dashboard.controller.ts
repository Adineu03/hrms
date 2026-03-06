import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamLearningDashboardService } from './team-learning-dashboard.service';

@Controller('learning-development/manager/team-dashboard')
export class TeamLearningDashboardController {
  constructor(
    private readonly service: TeamLearningDashboardService,
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
  @Roles('super_admin', 'admin', 'manager')
  async getDashboard() {
    return this.service.getTeamDashboard(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
