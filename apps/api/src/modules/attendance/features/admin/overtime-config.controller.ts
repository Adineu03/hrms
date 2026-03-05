import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OvertimeConfigService } from './overtime-config.service';

@Controller('attendance/admin/overtime')
export class OvertimeConfigController {
  constructor(
    private readonly overtimeConfigService: OvertimeConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('summary')
  @Roles('super_admin', 'admin')
  async getSummary() {
    const orgId = this.getOrgIdOrThrow();
    return this.overtimeConfigService.getSummary(orgId);
  }

  @Get('requests')
  @Roles('super_admin', 'admin')
  async listRequests(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.overtimeConfigService.listRequests(orgId, {
      status,
      startDate,
      endDate,
      departmentId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Patch('requests/:id')
  @Roles('super_admin', 'admin')
  async reviewRequest(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.tenantService.getUserId();
    return this.overtimeConfigService.reviewRequest(orgId, id, {
      ...body,
      reviewedBy: userId,
    });
  }

  @Get('reports')
  @Roles('super_admin', 'admin')
  async getReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.overtimeConfigService.getUtilizationReports(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }
}
