import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveBalanceService } from './leave-balance.service';

@Controller('leave-management/employee/balance')
export class LeaveBalanceController {
  constructor(
    private readonly leaveBalanceService: LeaveBalanceService,
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
  async getAllBalances(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveBalanceService.getAllBalances(orgId, userId, year);
  }

  @Get('accrual-schedule')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getAccrualSchedule() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveBalanceService.getAccrualSchedule(orgId, userId);
  }

  @Get('history')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveBalanceService.getHistory(orgId, userId);
  }

  @Get('policy-summary')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPolicySummary() {
    const orgId = this.getOrgIdOrThrow();
    return this.leaveBalanceService.getPolicySummary(orgId);
  }

  @Get('encashment-eligibility')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getEncashmentEligibility() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveBalanceService.getEncashmentEligibility(orgId, userId);
  }

  @Get('upcoming-holidays')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getUpcomingHolidays() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveBalanceService.getUpcomingHolidays(orgId, userId);
  }
}
