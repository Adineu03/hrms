import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamLeaveCalendarService } from './team-leave-calendar.service';

@Controller('leave-management/manager/team-calendar')
export class TeamLeaveCalendarController {
  constructor(
    private readonly teamLeaveCalendarService: TeamLeaveCalendarService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getManagerId(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get('monthly')
  @Roles('super_admin', 'admin', 'manager')
  async getMonthlyCalendar(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.teamLeaveCalendarService.getMonthlyCalendar(orgId, managerId, m, y);
  }

  @Get('availability')
  @Roles('super_admin', 'admin', 'manager')
  async getAvailability(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.teamLeaveCalendarService.getAvailability(
      orgId,
      managerId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
    );
  }

  @Get('staffing-check')
  @Roles('super_admin', 'admin', 'manager')
  async getStaffingCheck(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('threshold') threshold?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.teamLeaveCalendarService.getStaffingCheck(
      orgId,
      managerId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
      threshold ? parseInt(threshold, 10) : 60,
    );
  }

  @Post('quick-action')
  @Roles('super_admin', 'admin', 'manager')
  async quickAction(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.teamLeaveCalendarService.quickAction(orgId, managerId, body);
  }
}
