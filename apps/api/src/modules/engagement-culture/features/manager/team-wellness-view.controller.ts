import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamWellnessViewService } from './team-wellness-view.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('engagement-culture/manager/team-wellness')
export class TeamWellnessViewController {
  constructor(
    private readonly service: TeamWellnessViewService,
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
  async getTeamWellnessOverview() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamWellnessOverview(orgId, userId);
  }

  @Get('stress-indicators')
  async getStressIndicators() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getStressIndicators(orgId, userId);
  }

  @Get('recommendations')
  async getRecommendations() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamWellnessRecommendations(orgId, userId);
  }
}
