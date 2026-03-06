import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ActivityLogService } from './activity-log.service';

@Controller('daily-work-logging/employee/activities')
export class ActivityLogController {
  constructor(
    private readonly activityLogService: ActivityLogService,
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
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async listActivities(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.activityLogService.listActivities(orgId, userId, {
      from,
      to,
      projectId,
      tags,
      search,
      page,
      limit,
    });
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async createActivity(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.activityLogService.createActivity(orgId, userId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async updateActivity(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.activityLogService.updateActivity(orgId, userId, id, body);
  }

  @Get('tags')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTags() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.activityLogService.getTags(orgId, userId);
  }

  @Get('export')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async exportActivities(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.activityLogService.exportActivities(orgId, userId, { from, to, projectId });
  }
}
