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
import { WeeklyTimesheetService } from './weekly-timesheet.service';

@Controller('daily-work-logging/employee/weekly')
export class WeeklyTimesheetController {
  constructor(
    private readonly weeklyTimesheetService: WeeklyTimesheetService,
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
  async getWeekGrid(@Query('weekStart') weekStart?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.weeklyTimesheetService.getWeekGrid(orgId, userId, weekStart);
  }

  @Post('copy-week')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async copyPreviousWeek(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.weeklyTimesheetService.copyPreviousWeek(orgId, userId, body);
  }

  @Post('bulk-fill')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async bulkFill(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.weeklyTimesheetService.bulkFill(orgId, userId, body);
  }

  @Post('submit')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitWeek(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.weeklyTimesheetService.submitWeek(orgId, userId, body);
  }
}
