import { Controller, Get, Param, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SampleReportsService } from './sample-reports.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('demo-company/manager/sample-reports')
export class SampleReportsController {
  constructor(
    private readonly service: SampleReportsService,
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

  @Get()
  async getSampleReports() {
    return this.service.getSampleReports(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Get(':reportId/download')
  async downloadReport(@Param('reportId') reportId: string) {
    return this.service.downloadReport(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), reportId);
  }
}
