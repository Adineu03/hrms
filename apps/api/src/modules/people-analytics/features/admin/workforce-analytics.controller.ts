import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { WorkforceAnalyticsService } from './workforce-analytics.service';

@Roles('super_admin', 'admin')
@Controller('people-analytics/admin/workforce-analytics')
export class WorkforceAnalyticsController {
  constructor(
    private readonly service: WorkforceAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('attrition')
  async getAttrition() {
    return this.service.getAttrition(this.getOrgIdOrThrow());
  }

  @Get('headcount-trend')
  async getHeadcountTrend() {
    return this.service.getHeadcountTrend(this.getOrgIdOrThrow());
  }

  @Get('diversity')
  async getDiversity() {
    return this.service.getDiversity(this.getOrgIdOrThrow());
  }

  @Get('hiring-funnel')
  async getHiringFunnel() {
    return this.service.getHiringFunnel(this.getOrgIdOrThrow());
  }
}
