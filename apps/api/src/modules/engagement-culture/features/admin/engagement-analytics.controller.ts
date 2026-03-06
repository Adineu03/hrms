import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { EngagementAnalyticsService } from './engagement-analytics.service';

@Roles('super_admin', 'admin')
@Controller('engagement-culture/admin/analytics')
export class EngagementAnalyticsController {
  constructor(
    private readonly service: EngagementAnalyticsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('enps')
  async getEnps() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getEnpsTracking(orgId);
  }

  @Get('scores')
  async getScores() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getEngagementScoreTrends(orgId);
  }

  @Get('department-comparison')
  async getDepartmentComparison() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getDepartmentComparison(orgId);
  }

  @Get('attrition-risk')
  async getAttritionRisk() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getAttritionRiskCorrelation(orgId);
  }

  @Get('action-items')
  async getActionItems() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getActionItems(orgId);
  }

  @Post('action-items')
  async saveActionItems(@Body() dto: { actionItems: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.saveActionItems(orgId, dto.actionItems);
  }
}
