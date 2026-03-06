import { Body, Controller, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { NotificationCenterService } from './notification-center.service';

@Controller('platform-experience/employee/notifications')
export class NotificationCenterController {
  constructor(
    private readonly service: NotificationCenterService,
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
  async listNotifications(
    @Query('type') type?: string,
    @Query('module') moduleId?: string,
    @Query('isRead') isRead?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listNotifications(orgId, userId, {
      type,
      moduleId,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    });
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.markAsRead(orgId, userId, id);
  }

  @Post('mark-all-read')
  async markAllAsRead() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.markAllAsRead(orgId, userId);
  }

  @Get('preferences')
  async getPreferences() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPreferences(orgId, userId);
  }

  @Patch('preferences')
  async updatePreferences(@Body() dto: { email?: boolean; push?: boolean; inApp?: boolean; sms?: boolean }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updatePreferences(orgId, userId, dto);
  }

  @Get('history')
  async getHistory(@Query('page') page?: string, @Query('limit') limit?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getHistory(orgId, userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
