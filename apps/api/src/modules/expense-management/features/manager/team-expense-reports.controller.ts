import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamExpenseReportsService } from './team-expense-reports.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('expense-management/manager/team-reports')
export class TeamExpenseReportsController {
  constructor(
    private readonly service: TeamExpenseReportsService,
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

  @Get('summary')
  async getTeamSpendingAnalysis() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamSpendingAnalysis(orgId, userId);
  }

  @Get('category-breakdown')
  async getCategoryBreakdown() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCategoryBreakdown(orgId, userId);
  }

  @Get('top-spenders')
  async getTopSpenders() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTopSpenders(orgId, userId);
  }
}
