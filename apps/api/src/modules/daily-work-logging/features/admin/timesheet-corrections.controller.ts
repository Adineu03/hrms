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
import { TimesheetCorrectionsService } from './timesheet-corrections.service';

@Controller('daily-work-logging/admin/corrections')
export class TimesheetCorrectionsController {
  constructor(
    private readonly timesheetCorrectionsService: TimesheetCorrectionsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Post('override')
  @Roles('super_admin', 'admin')
  async adminOverride(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.timesheetCorrectionsService.adminOverride(orgId, body, adminUserId);
  }

  @Post('bulk-correct')
  @Roles('super_admin', 'admin')
  async bulkCorrect(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.timesheetCorrectionsService.bulkCorrect(orgId, body, adminUserId);
  }

  @Post('lock-period')
  @Roles('super_admin', 'admin')
  async lockPeriod(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.timesheetCorrectionsService.lockPeriod(orgId, body, adminUserId);
  }

  @Get('audit-trail')
  @Roles('super_admin', 'admin')
  async getAuditTrail(
    @Query('submissionId') submissionId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.timesheetCorrectionsService.getAuditTrail(orgId, {
      submissionId,
      employeeId,
      startDate,
      endDate,
    });
  }

  @Post('dispute')
  @Roles('super_admin', 'admin')
  async resolveDispute(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.timesheetCorrectionsService.resolveDispute(orgId, body, adminUserId);
  }
}
