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
import { IntegrationExportService } from './integration-export.service';

@Controller('daily-work-logging/admin/integrations')
export class IntegrationExportController {
  constructor(
    private readonly integrationExportService: IntegrationExportService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('payroll-export')
  @Roles('super_admin', 'admin')
  async getPayrollExport(
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.integrationExportService.getPayrollExport(orgId, {
      periodStart,
      periodEnd,
      departmentId,
    });
  }

  @Get('billing-export')
  @Roles('super_admin', 'admin')
  async getBillingExport(
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('projectId') projectId?: string,
    @Query('clientName') clientName?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.integrationExportService.getBillingExport(orgId, {
      periodStart,
      periodEnd,
      projectId,
      clientName,
    });
  }

  @Get('attendance-correlation')
  @Roles('super_admin', 'admin')
  async getAttendanceCorrelation(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.integrationExportService.getAttendanceCorrelation(orgId, {
      startDate,
      endDate,
      departmentId,
    });
  }

  @Post('export')
  @Roles('super_admin', 'admin')
  async customExport(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.integrationExportService.customExport(orgId, body);
  }
}
