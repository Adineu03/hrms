import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamComplianceDashboardService } from './team-compliance-dashboard.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('compliance-audit/manager/team-compliance')
export class TeamComplianceDashboardController {
  constructor(
    private readonly service: TeamComplianceDashboardService,
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

  @Get('overview')
  async getTeamComplianceOverview() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamComplianceOverview(orgId, userId);
  }

  @Get('members')
  async getTeamMemberStatus() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamMemberStatus(orgId, userId);
  }

  @Get('overdue')
  async getOverdueItems() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOverdueItems(orgId, userId);
  }

  @Post('remind/:employeeId')
  async sendReminder(@Param('employeeId') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.sendReminder(orgId, userId, employeeId);
  }
}
