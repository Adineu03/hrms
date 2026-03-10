import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { WorkforceAnalyticsDashboardService } from './workforce-analytics-dashboard.service';

@Roles('super_admin', 'admin')
@Controller('workforce-planning/admin/workforce-analytics')
export class WorkforceAnalyticsDashboardController {
  constructor(
    private readonly service: WorkforceAnalyticsDashboardService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('summary')
  async getSummary() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSummary(orgId);
  }

  @Get('headcount-trend')
  async getHeadcountTrend() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getHeadcountTrend(orgId);
  }

  @Get('attrition')
  async getAttritionStats() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getAttritionStats(orgId);
  }

  @Get('diversity')
  async getDiversityMetrics() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getDiversityMetrics(orgId);
  }

  @Get('promotion-rate')
  async getPromotionRate() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPromotionRate(orgId);
  }
}
