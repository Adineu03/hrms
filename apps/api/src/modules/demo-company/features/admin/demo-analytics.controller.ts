import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DemoAnalyticsService } from './demo-analytics.service';

@Roles('super_admin', 'admin')
@Controller('demo-company/admin/demo-analytics')
export class DemoAnalyticsController {
  constructor(
    private readonly service: DemoAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('summary')
  async getAnalyticsSummary() {
    return this.service.getAnalyticsSummary(this.getOrgIdOrThrow());
  }

  @Get('funnel')
  async getConversionFunnel() {
    return this.service.getConversionFunnel(this.getOrgIdOrThrow());
  }

  @Get('export')
  async exportDemoReport() {
    return this.service.exportDemoReport(this.getOrgIdOrThrow());
  }
}
