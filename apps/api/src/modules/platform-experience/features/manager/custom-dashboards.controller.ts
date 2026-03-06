import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CustomDashboardsService } from './custom-dashboards.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('platform-experience/manager/dashboards')
export class CustomDashboardsController {
  constructor(
    private readonly service: CustomDashboardsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async listDashboards() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listDashboards(orgId, userId);
  }

  @Post()
  async createDashboard(
    @Body() dto: { name: string; description?: string; layout?: Record<string, any>; isDefault?: boolean },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createDashboard(orgId, userId, dto);
  }

  @Patch(':id')
  async updateDashboard(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; layout?: Record<string, any>; isDefault?: boolean },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateDashboard(orgId, userId, id, dto);
  }

  @Delete(':id')
  async deleteDashboard(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.deleteDashboard(orgId, userId, id);
  }

  @Get(':id/widgets')
  async listWidgets(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listWidgets(orgId, id);
  }

  @Post(':id/widgets')
  async addWidget(
    @Param('id') id: string,
    @Body() dto: { widgetType: string; title: string; config?: Record<string, any>; position?: Record<string, any>; size?: Record<string, any> },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.addWidget(orgId, id, dto);
  }

  @Delete('widgets/:widgetId')
  async removeWidget(@Param('widgetId') widgetId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.removeWidget(orgId, widgetId);
  }

  @Post(':id/share')
  async toggleShare(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.toggleShare(orgId, userId, id);
  }
}
