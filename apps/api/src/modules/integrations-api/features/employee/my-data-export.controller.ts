import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyDataExportService } from './my-data-export.service';

@Controller('integrations-api/employee/my-data-export')
export class MyDataExportController {
  constructor(
    private readonly service: MyDataExportService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const id = this.tenantService.getUserId?.();
    if (!id) throw new UnauthorizedException('Missing user context');
    return id;
  }

  @Get('history')
  async getExportHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getExportHistory(orgId, userId);
  }

  @Post('request')
  async requestDataExport(
    @Body()
    dto: {
      categories: string[];
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.requestDataExport(orgId, userId, dto);
  }
}
