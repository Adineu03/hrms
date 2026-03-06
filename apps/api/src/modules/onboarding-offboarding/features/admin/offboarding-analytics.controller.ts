import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OffboardingAnalyticsService } from './offboarding-analytics.service';

@Controller('onboarding-offboarding/admin/offboarding-analytics')
export class OffboardingAnalyticsController {
  constructor(
    private readonly service: OffboardingAnalyticsService,
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

  @Get('exit-trends')
  @Roles('super_admin', 'admin')
  async getExitTrends(@Query('groupBy') groupBy?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getExitTrends(orgId, { groupBy });
  }

  @Get('processing-time')
  @Roles('super_admin', 'admin')
  async getProcessingTime(@Query('groupBy') groupBy?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getProcessingTime(orgId, { groupBy });
  }

  @Get('asset-recovery')
  @Roles('super_admin', 'admin')
  async getAssetRecovery() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getAssetRecovery(orgId);
  }

  @Get('exit-interview-rates')
  @Roles('super_admin', 'admin')
  async getExitInterviewRates() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getExitInterviewRates(orgId);
  }

  @Get('rehire-tracking')
  @Roles('super_admin', 'admin')
  async getRehireTracking() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRehireTracking(orgId);
  }
}
