import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamCompositionAnalyticsService } from './team-composition-analytics.service';

@Roles('manager', 'super_admin', 'admin')
@Controller('workforce-planning/manager/team-composition')
export class TeamCompositionAnalyticsController {
  constructor(
    private readonly service: TeamCompositionAnalyticsService,
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
  async getTeamComposition() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTeamComposition(orgId, managerId);
  }

  @Get('grade-distribution')
  async getGradeDistribution() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getGradeDistribution(orgId, managerId);
  }
}
