import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamHiringReportsService } from './team-hiring-reports.service';

@Controller('talent-acquisition/manager/reports')
export class TeamHiringReportsController {
  constructor(
    private readonly service: TeamHiringReportsService,
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

  @Get('overview')
  @Roles('super_admin', 'admin', 'manager')
  async getOverview() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getOverview(orgId, managerId);
  }

  @Get('time-to-fill')
  @Roles('super_admin', 'admin', 'manager')
  async getTimeToFill() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTimeToFill(orgId, managerId);
  }

  @Get('interview-ratio')
  @Roles('super_admin', 'admin', 'manager')
  async getInterviewToHireRatio() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getInterviewToHireRatio(orgId, managerId);
  }

  @Get('upcoming-joiners')
  @Roles('super_admin', 'admin', 'manager')
  async getUpcomingJoiners() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getUpcomingJoiners(orgId, managerId);
  }
}
