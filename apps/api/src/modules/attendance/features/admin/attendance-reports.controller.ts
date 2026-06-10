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

  @Get()
  @Roles('super_admin', 'admin')
  async generateReport(
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
    @Query('location') location?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.generateReport(orgId, {
      type: type || 'daily_summary',
      startDate,
      endDate,
      department,
      location,
    });
  }

  @Get('ai-insight')
  @Roles('super_admin', 'admin')
  async getAiInsight() {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getAiInsight(orgId);
  }

  @Get('departments')
  @Roles('super_admin', 'admin')
  async getDepartmentOptions() {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getDepartmentOptions(orgId);
  }

  @Get('locations')
  @Roles('super_admin', 'admin')
  async getLocationOptions() {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceReportsService.getLocationOptions(orgId);
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
