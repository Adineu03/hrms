import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveReportsService } from './leave-reports.service';

@Controller('leave-management/admin/reports')
export class LeaveReportsController {
  constructor(
    private readonly leaveReportsService: LeaveReportsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('utilization')
  @Roles('super_admin', 'admin')
  async getUtilization(
    @Query('year') year?: string,
    @Query('departmentId') departmentId?: string,
    @Query('locationId') locationId?: string,
    @Query('gradeId') gradeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveReportsService.getUtilization(orgId, {
      year,
      departmentId,
      locationId,
      gradeId,
      leaveTypeId,
    });
  }

  @Get('trends')
  @Roles('super_admin', 'admin')
  async getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveReportsService.getTrends(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }

  @Get('pending-approval')
  @Roles('super_admin', 'admin')
  async getPendingApproval(
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveReportsService.getPendingApproval(orgId, { departmentId });
  }

  @Get('liability')
  @Roles('super_admin', 'admin')
  async getLiability(
    @Query('year') year?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveReportsService.getLiability(orgId, { year, departmentId });
  }

  @Get('absenteeism')
  @Roles('super_admin', 'admin')
  async getAbsenteeism(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveReportsService.getAbsenteeism(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }
}
