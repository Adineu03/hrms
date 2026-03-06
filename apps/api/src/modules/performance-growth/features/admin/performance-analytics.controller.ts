import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PerformanceAnalyticsService } from './performance-analytics.service';

@Controller('performance-growth/admin/analytics')
export class PerformanceAnalyticsController {
  constructor(private readonly service: PerformanceAnalyticsService, private readonly tenantService: TenantService) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('distribution')
  @Roles('super_admin', 'admin')
  async getDistribution(@Query('cycleId') cycleId?: string) { return this.service.getPerformanceDistribution(this.getOrgIdOrThrow(), cycleId); }

  @Get('department-comparison')
  @Roles('super_admin', 'admin')
  async getDepartmentComparison(@Query('cycleId') cycleId?: string) { return this.service.getDepartmentComparison(this.getOrgIdOrThrow(), cycleId); }

  @Get('goal-achievement')
  @Roles('super_admin', 'admin')
  async getGoalAchievement() { return this.service.getGoalAchievementRates(this.getOrgIdOrThrow()); }

  @Get('review-completion')
  @Roles('super_admin', 'admin')
  async getReviewCompletion(@Query('cycleId') cycleId?: string) { return this.service.getReviewCompletionRates(this.getOrgIdOrThrow(), cycleId); }

  @Get('trends')
  @Roles('super_admin', 'admin')
  async getTrends() { return this.service.getPerformanceTrends(this.getOrgIdOrThrow()); }
}
