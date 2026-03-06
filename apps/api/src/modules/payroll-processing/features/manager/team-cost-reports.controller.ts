import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamCostReportsService } from './team-cost-reports.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('payroll-processing/manager/cost-reports')
export class TeamCostReportsController {
  constructor(
    private readonly service: TeamCostReportsService,
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

  @Get('breakdown')
  async getCostBreakdown() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCostBreakdown(orgId, userId);
  }

  @Get('budget-vs-actual')
  async getBudgetVsActual() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getBudgetVsActual(orgId, userId);
  }

  @Get('projections')
  async getCostProjections() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCostProjections(orgId, userId);
  }

  @Get('leave-impact')
  async getLeaveImpact() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getLeaveImpact(orgId, userId);
  }
}
