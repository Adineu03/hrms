import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveBalanceMgmtService } from './leave-balance-mgmt.service';

@Controller('leave-management/admin/balances')
export class LeaveBalanceMgmtController {
  constructor(
    private readonly leaveBalanceMgmtService: LeaveBalanceMgmtService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('year') year?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveBalanceMgmtService.list(orgId, {
      employeeId,
      leaveTypeId,
      year,
      departmentId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('credit')
  @Roles('super_admin', 'admin')
  async bulkCredit(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveBalanceMgmtService.bulkCredit(orgId, body);
  }

  @Post('debit')
  @Roles('super_admin', 'admin')
  async bulkDebit(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveBalanceMgmtService.bulkDebit(orgId, body);
  }

  @Post('adjust')
  @Roles('super_admin', 'admin')
  async adjust(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveBalanceMgmtService.adjust(orgId, body);
  }

  @Get('reports')
  @Roles('super_admin', 'admin')
  async reports(
    @Query('year') year?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveBalanceMgmtService.reportsByDepartment(orgId, {
      year,
      departmentId,
    });
  }

  @Post('year-end')
  @Roles('super_admin', 'admin')
  async yearEnd(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveBalanceMgmtService.yearEndProcessing(orgId, body);
  }
}
