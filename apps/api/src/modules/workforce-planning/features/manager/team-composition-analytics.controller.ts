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

  @Get()
  async getTeamComposition() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTeamComposition(orgId);
  }

  @Get('grade-distribution')
  async getGradeDistribution() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getGradeDistribution(orgId);
  }
}
