import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ReportingAnalyticsService } from './reporting-analytics.service';

@Controller('learning-development/admin/analytics')
export class ReportingAnalyticsController {
  constructor(
    private readonly service: ReportingAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('completion-rates')
  @Roles('super_admin', 'admin')
  async getCompletionRates(
    @Query('courseId') courseId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.getCompletionRates(this.getOrgIdOrThrow(), { courseId, departmentId });
  }

  @Get('engagement')
  @Roles('super_admin', 'admin')
  async getEngagement() {
    return this.service.getEngagementMetrics(this.getOrgIdOrThrow());
  }

  @Get('popular-content')
  @Roles('super_admin', 'admin')
  async getPopularContent() {
    return this.service.getPopularContent(this.getOrgIdOrThrow());
  }

  @Get('budget-utilization')
  @Roles('super_admin', 'admin')
  async getBudgetUtilization(@Query('fiscalYear') fiscalYear?: string) {
    return this.service.getBudgetUtilization(this.getOrgIdOrThrow(), fiscalYear);
  }
}
