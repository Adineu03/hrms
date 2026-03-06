import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamPayrollOverviewService } from './team-payroll-overview.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('payroll-processing/manager/team-overview')
export class TeamPayrollOverviewController {
  constructor(
    private readonly service: TeamPayrollOverviewService,
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
  async getTeamSalarySummary(@Query('month') month?: string, @Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamSalarySummary(
      orgId,
      userId,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('headcount-cost')
  async getHeadcountCostAnalysis() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getHeadcountCostAnalysis(orgId, userId);
  }

  @Get('overtime')
  async getOvertimeCost() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOvertimeCost(orgId, userId);
  }

  @Get('queries')
  async getPayrollQueries() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPayrollQueries(orgId, userId);
  }
}
