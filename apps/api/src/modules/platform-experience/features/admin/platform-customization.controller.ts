import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PlatformCustomizationService } from './platform-customization.service';

@Roles('super_admin', 'admin')
@Controller('platform-experience/admin/customization')
export class PlatformCustomizationController {
  constructor(
    private readonly service: PlatformCustomizationService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('dashboards')
  async listDashboards() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listDashboards(orgId);
  }

  @Post('dashboards')
  async createDashboard(@Body() dto: { name: string; description?: string; createdById: string; isDefault?: boolean; isShared?: boolean; layout?: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createDashboard(orgId, dto);
  }

  @Patch('dashboards/:id')
  async updateDashboard(@Param('id') id: string, @Body() dto: { name?: string; description?: string; isDefault?: boolean; isShared?: boolean; layout?: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateDashboard(orgId, id, dto);
  }

  @Delete('dashboards/:id')
  async deleteDashboard(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteDashboard(orgId, id);
  }

  @Get('dashboards/:dashboardId/widgets')
  async listWidgets(@Param('dashboardId') dashboardId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listWidgets(orgId, dashboardId);
  }

  @Post('dashboards/:dashboardId/widgets')
  async addWidget(@Param('dashboardId') dashboardId: string, @Body() dto: { widgetType: string; title: string; config?: any; position?: any; size?: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.addWidget(orgId, dashboardId, dto);
  }

  @Delete('widgets/:widgetId')
  async removeWidget(@Param('widgetId') widgetId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.removeWidget(orgId, widgetId);
  }
}
