import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveHistoryService } from './leave-history.service';

@Controller('leave-management/employee/history')
export class LeaveHistoryController {
  constructor(
    private readonly leaveHistoryService: LeaveHistoryService,
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
  async getAllRequests(
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveHistoryService.getAllRequests(orgId, userId, {
      leaveTypeId,
      status,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('summary')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSummary(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveHistoryService.getSummary(orgId, userId, year);
  }

  @Get('trends')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTrends() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveHistoryService.getTrends(orgId, userId);
  }

  @Get('pending')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPendingRequests() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveHistoryService.getPendingRequests(orgId, userId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getRequestDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveHistoryService.getRequestDetail(orgId, userId, id);
  }

  @Post(':id/reapply')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async reapplyLeave(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveHistoryService.reapplyLeave(orgId, userId, id, body);
  }
}
