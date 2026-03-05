import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OrgChartService } from './org-chart.service';

@Controller('core-hr/employee/org-chart')
export class OrgChartController {
  constructor(
    private readonly orgChartService: OrgChartService,
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
  async getOrgChart() {
    const orgId = this.getOrgIdOrThrow();
    return this.orgChartService.getOrgChart(orgId);
  }

  @Get('search')
  async searchOrgChart(@Query('q') query: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.orgChartService.searchOrgChart(orgId, query ?? '');
  }

  @Get('node/:userId')
  async getNode(@Param('userId') userId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.orgChartService.getNode(orgId, userId);
  }
}
