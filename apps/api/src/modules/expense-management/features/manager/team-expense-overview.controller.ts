import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamExpenseOverviewService } from './team-expense-overview.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('expense-management/manager/team-overview')
export class TeamExpenseOverviewController {
  constructor(
    private readonly service: TeamExpenseOverviewService,
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
  async getTeamExpenseSummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamExpenseSummary(orgId, userId);
  }

  @Get('members')
  async getTeamMemberExpenses() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamMemberExpenses(orgId, userId);
  }
}
