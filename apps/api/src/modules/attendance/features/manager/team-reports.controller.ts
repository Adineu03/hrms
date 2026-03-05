import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamReportsService } from './team-reports.service';

@Controller('attendance/manager/reports')
export class TeamReportsController {
  constructor(
    private readonly teamReportsService: TeamReportsService,
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

  @Get('attendance')
  @Roles('manager', 'admin', 'super_admin')
  async getAttendanceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.teamReportsService.getAttendanceReport(
      orgId,
      managerId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
    );
  }

  @Get('absenteeism')
  @Roles('manager', 'admin', 'super_admin')
  async getAbsenteeismReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.teamReportsService.getAbsenteeismReport(
      orgId,
      managerId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
      employeeId,
    );
  }

  @Get('punctuality')
  @Roles('manager', 'admin', 'super_admin')
  async getPunctualityReport(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    return this.teamReportsService.getPunctualityReport(
      orgId,
      managerId,
      month ?? String(now.getMonth() + 1),
      year ?? String(now.getFullYear()),
    );
  }

  @Get('shift-compliance')
  @Roles('manager', 'admin', 'super_admin')
  async getShiftComplianceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.teamReportsService.getShiftComplianceReport(
      orgId,
      managerId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
    );
  }
}
