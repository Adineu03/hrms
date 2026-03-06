import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DailyTimesheetService } from './daily-timesheet.service';

@Controller('daily-work-logging/employee/timesheet')
export class DailyTimesheetController {
  constructor(
    private readonly dailyTimesheetService: DailyTimesheetService,
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
  async getEntries(@Query('date') date?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.dailyTimesheetService.getEntriesForDate(orgId, userId, date);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async createEntry(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.dailyTimesheetService.createEntry(orgId, userId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async updateEntry(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.dailyTimesheetService.updateEntry(orgId, userId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async deleteEntry(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.dailyTimesheetService.deleteEntry(orgId, userId, id);
  }

  @Post('copy-previous')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async copyPreviousDay(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.dailyTimesheetService.copyPreviousDay(orgId, userId, body);
  }

  @Get('auto-populate')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getAutoPopulate(@Query('date') date?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.dailyTimesheetService.getAutoPopulateData(orgId, userId, date);
  }
}
