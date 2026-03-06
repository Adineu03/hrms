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
import { TimerService } from './timer.service';

@Controller('daily-work-logging/employee/timer')
export class TimerController {
  constructor(
    private readonly timerService: TimerService,
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

  @Get('active')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getActiveTimers() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.getActiveTimers(orgId, userId);
  }

  @Post('start')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async startTimer(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.startTimer(orgId, userId, body);
  }

  @Post(':id/stop')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async stopTimer(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.stopTimer(orgId, userId, id);
  }

  @Post(':id/pause')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async pauseTimer(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.pauseTimer(orgId, userId, id);
  }

  @Post(':id/resume')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async resumeTimer(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.resumeTimer(orgId, userId, id);
  }

  @Get('history')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTimerHistory(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.getTimerHistory(orgId, userId, { from, to, page, limit });
  }

  @Post(':id/convert')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async convertToEntry(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.convertToEntry(orgId, userId, id, body);
  }

  @Get('daily-summary')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getDailySummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timerService.getDailySummary(orgId, userId);
  }
}
