import { Controller, Get, Post, Body, Param, Delete, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ReportBuilderService } from './report-builder.service';

@Roles('super_admin', 'admin')
@Controller('people-analytics/admin/report-builder')
export class ReportBuilderController {
  constructor(
    private readonly service: ReportBuilderService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getReports() {
    return this.service.getReports(this.getOrgIdOrThrow());
  }

  @Post()
  async createReport(@Body() body: Record<string, unknown>) {
    const userId = this.tenantService.getUserId();
    return this.service.createReport(this.getOrgIdOrThrow(), body, userId);
  }

  @Delete(':id')
  async deleteReport(@Param('id') id: string) {
    return this.service.deleteReport(this.getOrgIdOrThrow(), id);
  }
}
