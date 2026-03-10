import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyAnalyticsService } from './my-analytics.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('people-analytics/employee/my-analytics')
export class MyAnalyticsController {
  constructor(
    private readonly service: MyAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async getMyAnalytics() {
    return this.service.getMyAnalytics(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
