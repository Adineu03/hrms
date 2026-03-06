import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OneOnOneMeetingService } from './one-on-one-meeting.service';

@Controller('performance-growth/manager/one-on-ones')
export class OneOnOneMeetingController {
  constructor(
    private readonly service: OneOnOneMeetingService,
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
  @Roles('super_admin', 'admin', 'manager')
  async listMeetings(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listMeetings(orgId, managerId, { status, employeeId });
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async scheduleMeeting(@Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.scheduleMeeting(orgId, managerId, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getMeeting(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getMeeting(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async updateMeeting(@Param('id') id: string, @Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateMeeting(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'manager')
  async cancelMeeting(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.cancelMeeting(orgId, id);
  }

  @Post(':id/complete')
  @Roles('super_admin', 'admin', 'manager')
  async completeMeeting(@Param('id') id: string, @Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.completeMeeting(orgId, id, body);
  }

  @Get(':id/action-items')
  @Roles('super_admin', 'admin', 'manager')
  async getActionItems(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getActionItems(orgId, id);
  }

  @Patch(':id/action-items/:index')
  @Roles('super_admin', 'admin', 'manager')
  async updateActionItem(
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() body: any,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateActionItem(orgId, id, parseInt(index, 10), body);
  }
}
