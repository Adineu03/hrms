import { Controller, Get, Param, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamCompensationViewService } from './team-compensation-view.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('compensation-rewards/manager/team-compensation')
export class TeamCompensationViewController {
  constructor(
    private readonly service: TeamCompensationViewService,
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
  async getTeamSalaryOverview() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamSalaryOverview(orgId, userId);
  }

  @Get(':employeeId/history')
  async getCompensationHistory(@Param('employeeId') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCompensationHistory(orgId, userId, employeeId);
  }

  @Get('budget-utilization')
  async getBudgetUtilization() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getBudgetUtilization(orgId, userId);
  }
}
