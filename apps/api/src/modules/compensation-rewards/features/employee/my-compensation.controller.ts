import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyCompensationService } from './my-compensation.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('compensation-rewards/employee/my-compensation')
export class MyCompensationController {
  constructor(
    private readonly service: MyCompensationService,
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
  async getCurrentCtcBreakdown() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCurrentCtcBreakdown(orgId, userId);
  }

  @Get('history')
  async getCompensationHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCompensationHistory(orgId, userId);
  }

  @Get('total-rewards')
  async getTotalRewardsView() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTotalRewardsView(orgId, userId);
  }
}
