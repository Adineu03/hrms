import { Body, Controller, Get, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamNotificationsService } from './team-notifications.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('platform-experience/manager/team-notifications')
export class TeamNotificationsController {
  constructor(
    private readonly service: TeamNotificationsService,
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
  async getTeamNotificationPrefs() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamNotificationPrefs(orgId, userId);
  }

  @Patch()
  async updateTeamNotificationPrefs(
    @Body() dto: { notificationPrefs?: Record<string, any>; teamAlerts?: Record<string, any> },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateTeamNotificationPrefs(orgId, userId, dto);
  }

  @Get('escalation-rules')
  async getEscalationRules() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getEscalationRules(orgId, userId);
  }

  @Post('announcements')
  async createTeamAnnouncement(
    @Body() dto: { title: string; message: string; priority?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createTeamAnnouncement(orgId, userId, dto);
  }

  @Get('announcements')
  async listTeamAnnouncements() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listTeamAnnouncements(orgId, userId);
  }

  @Get('read-tracking')
  async getReadTracking() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getReadTracking(orgId, userId);
  }
}
