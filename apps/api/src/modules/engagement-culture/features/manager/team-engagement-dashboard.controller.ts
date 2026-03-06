import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamEngagementDashboardService } from './team-engagement-dashboard.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('engagement-culture/manager/team-engagement')
export class TeamEngagementDashboardController {
  constructor(
    private readonly service: TeamEngagementDashboardService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async getTeamEngagementScores() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamEngagementScores(orgId, userId);
  }

  @Get('pulse-results')
  async getPulseResults() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getLatestPulseResults(orgId, userId);
  }

  @Get('participation')
  async getParticipation() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamParticipationRates(orgId, userId);
  }

  @Get('action-items')
  async getActionItems() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getActionItems(orgId, userId);
  }
}
