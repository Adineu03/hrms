import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DataExportTeamService } from './data-export-team.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('integrations-api/manager/data-export-team')
export class DataExportTeamController {
  constructor(
    private readonly service: DataExportTeamService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('history')
  async getExportHistory() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getExportHistory(orgId);
  }

  @Post('export')
  async requestExport(
    @Body()
    dto: {
      dataType: string;
      dateFrom: string;
      dateTo: string;
      fields: string[];
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.requestExport(orgId, dto);
  }
}
