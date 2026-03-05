import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveReportsManagerService } from './leave-reports-manager.service';

@Controller('leave-management/manager/reports')
export class LeaveReportsManagerController {
  constructor(
    private readonly leaveReportsManagerService: LeaveReportsManagerService,
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

  private getDefaultDateRange(): { startDate: string; endDate: string } {
    const now = new Date();
    const startDate = `${now.getFullYear()}-01-01`;
    const endDate = `${now.getFullYear()}-12-31`;
    return { startDate, endDate };
  }

  @Get('utilization')
  @Roles('super_admin', 'admin', 'manager')
  async getUtilization(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const defaults = this.getDefaultDateRange();
    return this.leaveReportsManagerService.getUtilization(
      orgId,
      managerId,
      startDate ?? defaults.startDate,
      endDate ?? defaults.endDate,
    );
  }

  @Get('absenteeism')
  @Roles('super_admin', 'admin', 'manager')
  async getAbsenteeism(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const defaults = this.getDefaultDateRange();
    return this.leaveReportsManagerService.getAbsenteeism(
      orgId,
      managerId,
      startDate ?? defaults.startDate,
      endDate ?? defaults.endDate,
    );
  }

  @Get('leave-vs-attendance')
  @Roles('super_admin', 'admin', 'manager')
  async getLeaveVsAttendance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const defaults = this.getDefaultDateRange();
    return this.leaveReportsManagerService.getLeaveVsAttendance(
      orgId,
      managerId,
      startDate ?? defaults.startDate,
      endDate ?? defaults.endDate,
    );
  }

  @Get('export')
  @Roles('super_admin', 'admin', 'manager')
  async exportReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const defaults = this.getDefaultDateRange();
    return this.leaveReportsManagerService.exportReport(
      orgId,
      managerId,
      startDate ?? defaults.startDate,
      endDate ?? defaults.endDate,
    );
  }
}
