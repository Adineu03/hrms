import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveCalendarService } from './leave-calendar.service';

@Controller('leave-management/employee/calendar')
export class LeaveCalendarController {
  constructor(
    private readonly leaveCalendarService: LeaveCalendarService,
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

  @Get('monthly')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getMonthlyCalendar(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    const m = month || String(new Date().getMonth() + 1);
    const y = year || String(new Date().getFullYear());
    return this.leaveCalendarService.getMonthlyCalendar(orgId, userId, m, y);
  }

  @Get('daily/:date')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getDailyDetail(@Param('date') date: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveCalendarService.getDailyDetail(orgId, userId, date);
  }

  @Get('team-on-leave')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTeamOnLeave(@Query('date') date: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    const targetDate = date || new Date().toISOString().slice(0, 10);
    return this.leaveCalendarService.getTeamOnLeave(orgId, userId, targetDate);
  }

  @Get('holidays')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getHolidays(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveCalendarService.getHolidays(orgId, userId, year);
  }

  @Get('long-weekends')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getLongWeekends() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveCalendarService.getLongWeekends(orgId, userId);
  }
}
