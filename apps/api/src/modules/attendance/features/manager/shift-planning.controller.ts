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
import { ShiftPlanningService } from './shift-planning.service';

@Controller('attendance/manager/shift-planning')
export class ShiftPlanningController {
  constructor(
    private readonly shiftPlanningService: ShiftPlanningService,
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

  @Get('roster')
  @Roles('manager', 'admin', 'super_admin')
  async getRoster(@Query('weekStart') weekStart?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    // Default to current week's Monday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const defaultWeekStart = monday.toISOString().split('T')[0];

    return this.shiftPlanningService.getRoster(
      orgId,
      managerId,
      weekStart ?? defaultWeekStart,
    );
  }

  @Post('assign')
  @Roles('manager', 'admin', 'super_admin')
  async assignShift(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.shiftPlanningService.assignShift(orgId, managerId, body as any);
  }

  @Get('swap-requests')
  @Roles('manager', 'admin', 'super_admin')
  async getSwapRequests() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.shiftPlanningService.getSwapRequests(orgId, managerId);
  }

  @Patch('swap-requests/:id')
  @Roles('manager', 'admin', 'super_admin')
  async handleSwapRequest(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.shiftPlanningService.handleSwapRequest(orgId, managerId, id, body as any);
  }

  @Get('coverage')
  @Roles('manager', 'admin', 'super_admin')
  async getShiftCoverage(@Query('date') date?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.shiftPlanningService.getShiftCoverage(
      orgId,
      managerId,
      date ?? new Date().toISOString().split('T')[0],
    );
  }

  @Post('publish')
  @Roles('manager', 'admin', 'super_admin')
  async publishSchedule(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.shiftPlanningService.publishSchedule(orgId, managerId, body as any);
  }
}
