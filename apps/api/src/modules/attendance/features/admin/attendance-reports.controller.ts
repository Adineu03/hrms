import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { AttendanceReportsService } from './attendance-reports.service';

@Controller('attendance/admin/reports')
export class AttendanceReportsController {
  constructor(
    private readonly attendanceReportsService: AttendanceReportsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('daily-summary')
  @Roles('super_admin', 'admin')
  async getDailySummary(
    @Query('date') date?: string,
    @Query('departmentId') departmentId?: string,
    @Query('locationId') locationId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getDailySummary(orgId, {
      date,
      departmentId,
      locationId,
    });
  }

  @Get('late-comers')
  @Roles('super_admin', 'admin')
  async getLateComers(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getLateComers(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }

  @Get('absenteeism')
  @Roles('super_admin', 'admin')
  async getAbsenteeismTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getAbsenteeismTrends(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }

  @Get('shift-adherence')
  @Roles('super_admin', 'admin')
  async getShiftAdherence() {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getShiftAdherence(orgId);
  }

  @Get('overtime-utilization')
  @Roles('super_admin', 'admin')
  async getOvertimeUtilization(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getOvertimeUtilization(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }
}
