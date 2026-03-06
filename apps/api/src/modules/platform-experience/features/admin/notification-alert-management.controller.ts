import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { NotificationAlertManagementService } from './notification-alert-management.service';

@Roles('super_admin', 'admin')
@Controller('platform-experience/admin/notifications')
export class NotificationAlertManagementController {
  constructor(
    private readonly service: NotificationAlertManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('templates')
  async listTemplates() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listTemplates(orgId);
  }

  @Post('templates')
  async createTemplate(@Body() dto: { name: string; eventType: string; channel?: string; subject?: string; bodyTemplate: string; variables?: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createTemplate(orgId, dto);
  }

  @Patch('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() dto: { name?: string; eventType?: string; channel?: string; subject?: string; bodyTemplate?: string; variables?: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateTemplate(orgId, id, dto);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteTemplate(orgId, id);
  }

  @Patch('templates/:id/toggle')
  async toggleTemplate(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.toggleTemplate(orgId, id);
  }

  @Get('analytics')
  async getAnalytics() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getNotificationAnalytics(orgId);
  }
}
