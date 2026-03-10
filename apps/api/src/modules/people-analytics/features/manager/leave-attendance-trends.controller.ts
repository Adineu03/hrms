import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveAttendanceTrendsService } from './leave-attendance-trends.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('people-analytics/manager/leave-attendance-trends')
export class LeaveAttendanceTrendsController {
  constructor(
    private readonly service: LeaveAttendanceTrendsService,
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
  async getTrends() {
    return this.service.getTrends(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
