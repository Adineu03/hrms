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
import { TimesheetComplianceService } from './timesheet-compliance.service';

@Controller('daily-work-logging/manager/compliance')
export class TimesheetComplianceController {
  constructor(
    private readonly service: TimesheetComplianceService,
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
  async getSubmissionTracker(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getSubmissionTracker(orgId, managerId, startDate, endDate);
  }

  @Post('remind')
  @Roles('super_admin', 'admin', 'manager')
  async sendReminders(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.sendReminders(orgId, managerId, body);
  }

  @Get('scores')
  @Roles('super_admin', 'admin', 'manager')
  async getComplianceScores() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getComplianceScores(orgId, managerId);
  }
}
