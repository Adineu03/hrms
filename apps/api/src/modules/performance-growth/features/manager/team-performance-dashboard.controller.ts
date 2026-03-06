import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamPerformanceDashboardService } from './team-performance-dashboard.service';

@Controller('performance-growth/manager/team-dashboard')
export class TeamPerformanceDashboardController {
  constructor(private readonly service: TeamPerformanceDashboardService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  async getOverview() { return this.service.getTeamOverview(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('goal-progress')
  @Roles('super_admin', 'admin', 'manager')
  async getGoalProgress() { return this.service.getTeamGoalProgress(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('pending-actions')
  @Roles('super_admin', 'admin', 'manager')
  async getPendingActions() { return this.service.getPendingActions(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('distribution')
  @Roles('super_admin', 'admin', 'manager')
  async getDistribution(@Query('cycleId') cycleId?: string) { return this.service.getTeamDistribution(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), cycleId); }
}
