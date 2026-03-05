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
import { ShiftViewService } from './shift-view.service';

@Controller('attendance/employee/shifts')
export class ShiftViewController {
  constructor(
    private readonly shiftViewService: ShiftViewService,
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

  @Get('current')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCurrentShift() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.shiftViewService.getCurrentShift(orgId, userId);
  }

  @Get('schedule')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSchedule(
    @Query('view') view: string,
    @Query('date') date: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.shiftViewService.getSchedule(orgId, userId, view || 'week', date);
  }

  @Get('history')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getHistory(@Query('limit') limit: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.shiftViewService.getHistory(orgId, userId, limit ? parseInt(limit, 10) : 20);
  }

  @Post('swap-request')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async createSwapRequest(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.shiftViewService.createSwapRequest(orgId, userId, body);
  }

  @Get('swap-requests')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async listSwapRequests(@Query('status') status: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.shiftViewService.listSwapRequests(orgId, userId, status || undefined);
  }

  @Get('swap-requests/:id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSwapRequest(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.shiftViewService.getSwapRequest(orgId, userId, id);
  }
}
