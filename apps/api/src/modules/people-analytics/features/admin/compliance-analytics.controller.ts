import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ComplianceAnalyticsService } from './compliance-analytics.service';

@Roles('super_admin', 'admin')
@Controller('people-analytics/admin/compliance-analytics')
export class ComplianceAnalyticsController {
  constructor(
    private readonly service: ComplianceAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('summary')
  async getSummary() {
    return this.service.getSummary(this.getOrgIdOrThrow());
  }

  @Get('risk-heatmap')
  async getRiskHeatmap() {
    return this.service.getRiskHeatmap(this.getOrgIdOrThrow());
  }
}
