import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamLeaveBalanceService } from './team-leave-balance.service';

@Controller('leave-management/manager/team-balance')
export class TeamLeaveBalanceController {
  constructor(
    private readonly teamLeaveBalanceService: TeamLeaveBalanceService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getManagerId(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  async getTeamBalances(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const y = year ?? String(new Date().getFullYear());
    return this.teamLeaveBalanceService.getTeamBalances(orgId, managerId, y);
  }

  @Get('excessive-unused')
  @Roles('super_admin', 'admin', 'manager')
  async getExcessiveUnused(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const y = year ?? String(new Date().getFullYear());
    return this.teamLeaveBalanceService.getExcessiveUnused(orgId, managerId, y);
  }

  @Get('year-end-summary')
  @Roles('super_admin', 'admin', 'manager')
  async getYearEndSummary(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const y = year ?? String(new Date().getFullYear());
    return this.teamLeaveBalanceService.getYearEndSummary(orgId, managerId, y);
  }

  @Get('export')
  @Roles('super_admin', 'admin', 'manager')
  async exportTeamBalance(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const y = year ?? String(new Date().getFullYear());
    return this.teamLeaveBalanceService.exportTeamBalance(orgId, managerId, y);
  }
}
