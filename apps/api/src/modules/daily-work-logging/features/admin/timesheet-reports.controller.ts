import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TimesheetReportsService } from './timesheet-reports.service';

@Controller('daily-work-logging/admin/reports')
export class TimesheetReportsController {
  constructor(
    private readonly timesheetReportsService: TimesheetReportsService,
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @Query('projectId') projectId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.timesheetReportsService.getUtilization(orgId, {
      startDate,
      endDate,
      departmentId,
      projectId,
    });
  }

  @Get('project-allocation')
  @Roles('super_admin', 'admin')
  async getProjectAllocation(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('projectId') projectId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.timesheetReportsService.getProjectAllocation(orgId, {
      startDate,
      endDate,
      projectId,
    });
  }

  @Get('productivity')
  @Roles('super_admin', 'admin')
  async getProductivity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.timesheetReportsService.getProductivity(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }

  @Get('compliance')
  @Roles('super_admin', 'admin')
  async getCompliance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.timesheetReportsService.getCompliance(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }

  @Get('trends')
  @Roles('super_admin', 'admin')
  async getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.timesheetReportsService.getTrends(orgId, {
      startDate,
      endDate,
      groupBy,
      departmentId,
    });
  }
}
