import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyEngagementScoreService } from './my-engagement-score.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('engagement-culture/employee/my-engagement')
export class MyEngagementScoreController {
  constructor(
    private readonly service: MyEngagementScoreService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async getPersonalMetrics() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPersonalMetrics(orgId, userId);
  }

  @Get('history')
  async getScoreHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getScoreHistory(orgId, userId);
  }

  @Get('badges')
  async getBadges() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getBadges(orgId, userId);
  }

  @Get('participation')
  async getParticipationHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getParticipationHistory(orgId, userId);
  }
}
