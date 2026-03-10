import { Controller, Get, Post, Body, Delete, Param, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CustomMetricsService } from './custom-metrics.service';

@Roles('super_admin', 'admin')
@Controller('people-analytics/admin/custom-metrics')
export class CustomMetricsController {
  constructor(
    private readonly service: CustomMetricsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getKpis() {
    return this.service.getKpis(this.getOrgIdOrThrow());
  }

  @Post()
  async createKpi(@Body() body: Record<string, unknown>) {
    return this.service.createKpi(this.getOrgIdOrThrow(), body);
  }

  @Delete(':id')
  async deleteKpi(@Param('id') id: string) {
    return this.service.deleteKpi(this.getOrgIdOrThrow(), id);
  }
}
