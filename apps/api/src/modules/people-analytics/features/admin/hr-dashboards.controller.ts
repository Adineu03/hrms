import { Controller, Get, Post, Body, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { HrDashboardsService } from './hr-dashboards.service';

@Roles('super_admin', 'admin')
@Controller('people-analytics/admin/hr-dashboards')
export class HrDashboardsController {
  constructor(
    private readonly service: HrDashboardsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('kpis')
  async getKpis() {
    return this.service.getKpis(this.getOrgIdOrThrow());
  }

  @Post('pin-metric')
  async pinMetric(@Body() body: Record<string, unknown>) {
    return this.service.pinMetric(this.getOrgIdOrThrow(), body);
  }
}
