import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamDashboardService } from './team-dashboard.service';

@Controller('attendance/manager/team-dashboard')
export class TeamDashboardController {
  constructor(
    private readonly teamDashboardService: TeamDashboardService,
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

  @Get('today')
  @Roles('manager', 'admin', 'super_admin')
  async getTodayAttendance() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamDashboardService.getTodayAttendance(orgId, managerId);
  }

  @Get('summary')
  @Roles('manager', 'admin', 'super_admin')
  async getAttendanceSummary(
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamDashboardService.getAttendanceSummary(
      orgId,
      managerId,
      period ?? 'monthly',
      date ?? new Date().toISOString().split('T')[0],
    );
  }

  @Get('heatmap')
  @Roles('manager', 'admin', 'super_admin')
  async getHeatmap(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.teamDashboardService.getHeatmap(
      orgId,
      managerId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
    );
  }
}
