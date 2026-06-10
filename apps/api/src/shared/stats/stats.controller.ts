import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../multi-tenancy/tenant.service';
import { StatsService } from './stats.service';
import { DashboardOverviewService } from './dashboard-overview.service';
import type { DashboardOverviewResponse } from './dashboard-overview.types';

@Controller('dashboard')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly overviewService: DashboardOverviewService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('stats')
  async getStats() {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return this.statsService.getOrgStats(orgId);
  }

  @Get('overview')
  async getOverview(): Promise<DashboardOverviewResponse> {
    const ctx = this.tenantService.getContext();
    if (!ctx) throw new UnauthorizedException('Missing organization context');
    return this.overviewService.getOverview(ctx);
  }
}
