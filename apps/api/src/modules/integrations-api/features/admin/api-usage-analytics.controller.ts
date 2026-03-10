import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ApiUsageAnalyticsService } from './api-usage-analytics.service';

@Roles('super_admin', 'admin')
@Controller('integrations-api/admin/api-usage-analytics')
export class ApiUsageAnalyticsController {
  constructor(
    private readonly service: ApiUsageAnalyticsService,
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

  @Get('keys-usage')
  async getKeysUsage() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getKeysUsage(orgId);
  }

  @Get('error-trends')
  async getErrorTrends() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getErrorTrends(orgId);
  }
}
