import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyAttendanceService } from './my-attendance.service';

@Controller('attendance/employee/my-attendance')
export class MyAttendanceController {
  constructor(
    private readonly myAttendanceService: MyAttendanceService,
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

  @Get('calendar')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCalendar(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.myAttendanceService.getCalendar(orgId, userId, m, y);
  }

  @Get('daily/:date')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getDailyDetail(@Param('date') date: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.myAttendanceService.getDailyDetail(orgId, userId, date);
  }

  @Get('summary')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getMonthlySummary(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.myAttendanceService.getMonthlySummary(orgId, userId, m, y);
  }

  @Get('ytd')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getYtdStats() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.myAttendanceService.getYtdStats(orgId, userId);
  }

  @Get('trends')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTrends(@Query('months') months: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    const m = months ? parseInt(months, 10) : 3;
    return this.myAttendanceService.getTrends(orgId, userId, m);
  }

  @Get('today')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getToday() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.myAttendanceService.getToday(orgId, userId);
  }
}
