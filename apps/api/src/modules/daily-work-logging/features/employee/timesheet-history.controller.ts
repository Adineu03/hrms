import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TimesheetHistoryService } from './timesheet-history.service';

@Controller('daily-work-logging/employee/history')
export class TimesheetHistoryController {
  constructor(
    private readonly timesheetHistoryService: TimesheetHistoryService,
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
  async listSubmissions(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timesheetHistoryService.listSubmissions(orgId, userId, {
      status,
      from,
      to,
      projectId,
      page,
      limit,
    });
  }

  @Get('summary')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timesheetHistoryService.getSummary(orgId, userId, { from, to });
  }

  @Get('compliance')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCompliance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timesheetHistoryService.getCompliance(orgId, userId, { from, to });
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSubmission(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timesheetHistoryService.getSubmission(orgId, userId, id);
  }

  @Patch(':id/resubmit')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async resubmit(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timesheetHistoryService.resubmit(orgId, userId, id, body);
  }

  @Patch(':id/withdraw')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async withdraw(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timesheetHistoryService.withdraw(orgId, userId, id);
  }

  @Get(':id/pdf')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPdf(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.timesheetHistoryService.getPdfData(orgId, userId, id);
  }
}
