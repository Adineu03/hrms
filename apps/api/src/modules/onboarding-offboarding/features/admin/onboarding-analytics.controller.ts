import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OnboardingAnalyticsService } from './onboarding-analytics.service';

@Controller('onboarding-offboarding/admin/onboarding-analytics')
export class OnboardingAnalyticsController {
  constructor(
    private readonly service: OnboardingAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('overview')
  @Roles('super_admin', 'admin')
  async getOverview() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getOverview(orgId);
  }

  @Get('time-to-productivity')
  @Roles('super_admin', 'admin')
  async getTimeToProductivity(@Query('groupBy') groupBy?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTimeToProductivity(orgId, { groupBy });
  }

  @Get('task-completion-rates')
  @Roles('super_admin', 'admin')
  async getTaskCompletionRates(@Query('groupBy') groupBy?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTaskCompletionRates(orgId, { groupBy });
  }

  @Get('bottlenecks')
  @Roles('super_admin', 'admin')
  async getBottlenecks() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getBottlenecks(orgId);
  }

  @Get('satisfaction')
  @Roles('super_admin', 'admin')
  async getSatisfaction() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSatisfaction(orgId);
  }

  @Get('cost-tracking')
  @Roles('super_admin', 'admin')
  async getCostTracking() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCostTracking(orgId);
  }
}
