import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OvertimeApprovalService } from './overtime-approval.service';

@Controller('attendance/manager/overtime')
export class OvertimeApprovalController {
  constructor(
    private readonly overtimeApprovalService: OvertimeApprovalService,
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

  @Get('requests')
  @Roles('manager', 'admin', 'super_admin')
  async listRequests(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.overtimeApprovalService.listRequests(orgId, managerId, {
      status,
      startDate,
      endDate,
    });
  }

  @Patch('requests/:id')
  @Roles('manager', 'admin', 'super_admin')
  async handleRequest(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.overtimeApprovalService.handleRequest(orgId, managerId, id, body as any);
  }

  @Post('requests/bulk-action')
  @Roles('manager', 'admin', 'super_admin')
  async bulkAction(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.overtimeApprovalService.bulkAction(orgId, managerId, body as any);
  }

  @Get('summary')
  @Roles('manager', 'admin', 'super_admin')
  async getOvertimeSummary(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    return this.overtimeApprovalService.getOvertimeSummary(
      orgId,
      managerId,
      month ?? String(now.getMonth() + 1),
      year ?? String(now.getFullYear()),
    );
  }

  @Get('trends')
  @Roles('manager', 'admin', 'super_admin')
  async getOvertimeTrends(@Query('months') months?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.overtimeApprovalService.getOvertimeTrends(
      orgId,
      managerId,
      parseInt(months ?? '3', 10),
    );
  }
}
