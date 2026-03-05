import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveCorrelationService } from './leave-correlation.service';

@Controller('attendance/manager/leave-correlation')
export class LeaveCorrelationController {
  constructor(
    private readonly leaveCorrelationService: LeaveCorrelationService,
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
  @Roles('manager', 'admin', 'super_admin')
  async getCalendar(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    return this.leaveCorrelationService.getCalendar(
      orgId,
      managerId,
      month ?? String(now.getMonth() + 1),
      year ?? String(now.getFullYear()),
    );
  }

  @Get('unapproved-absences')
  @Roles('manager', 'admin', 'super_admin')
  async getUnapprovedAbsences(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.leaveCorrelationService.getUnapprovedAbsences(
      orgId,
      managerId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
    );
  }

  @Get('summary')
  @Roles('manager', 'admin', 'super_admin')
  async getCorrelationSummary() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.leaveCorrelationService.getCorrelationSummary(orgId, managerId);
  }
}
