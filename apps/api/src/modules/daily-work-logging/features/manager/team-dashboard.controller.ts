import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamDashboardService } from './team-dashboard.service';

@Controller('daily-work-logging/manager/dashboard')
export class TeamDashboardController {
  constructor(
    private readonly service: TeamDashboardService,
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
  async getTeamSubmissionStatus(
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTeamSubmissionStatus(orgId, managerId, periodStart, periodEnd);
  }

  @Get('summary')
  @Roles('super_admin', 'admin', 'manager')
  async getHoursSummary() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getHoursSummary(orgId, managerId);
  }

  @Get('today')
  @Roles('super_admin', 'admin', 'manager')
  async getTodayView() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTodayView(orgId, managerId);
  }
}
