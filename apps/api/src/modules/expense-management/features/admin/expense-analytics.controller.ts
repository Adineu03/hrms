import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExpenseAnalyticsService } from './expense-analytics.service';

@Roles('super_admin', 'admin')
@Controller('expense-management/admin/analytics')
export class ExpenseAnalyticsController {
  constructor(
    private readonly service: ExpenseAnalyticsService,
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

  @Get('department-breakdown')
  async getDepartmentBreakdown() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getDepartmentBreakdown(orgId);
  }

  @Get('trends')
  async getTrends(@Query('months') months?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTrends(orgId, months ? parseInt(months, 10) : 6);
  }

  @Get('policy-violations')
  async getPolicyViolations() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPolicyViolations(orgId);
  }
}
