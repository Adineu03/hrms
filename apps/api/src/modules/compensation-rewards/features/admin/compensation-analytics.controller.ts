import { Controller, Get, Param, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CompensationAnalyticsService } from './compensation-analytics.service';

@Roles('super_admin', 'admin')
@Controller('compensation-rewards/admin/analytics')
export class CompensationAnalyticsController {
  constructor(
    private readonly service: CompensationAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('pay-equity')
  async getPayEquity() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPayEquityAnalysis(orgId);
  }

  @Get('benchmarking')
  async getBenchmarking() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCompensationBenchmarking(orgId);
  }

  @Get('budget-vs-actual')
  async getBudgetVsActual() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getBudgetVsActual(orgId);
  }

  @Get('total-rewards/:employeeId')
  async getTotalRewards(@Param('employeeId') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTotalRewardsStatement(orgId, employeeId);
  }
}
