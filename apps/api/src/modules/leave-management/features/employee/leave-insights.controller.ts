import {
  Controller,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveInsightsService } from './leave-insights.service';

@Controller('leave-management/employee/insights')
export class LeaveInsightsController {
  constructor(
    private readonly leaveInsightsService: LeaveInsightsService,
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

  @Get('summary')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveInsightsService.getSummary(orgId, userId);
  }

  @Get('type-breakdown')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTypeBreakdown() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveInsightsService.getTypeBreakdown(orgId, userId);
  }

  @Get('monthly-trends')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getMonthlyTrends() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveInsightsService.getMonthlyTrends(orgId, userId);
  }

  @Get('projection')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getProjection() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveInsightsService.getProjection(orgId, userId);
  }

  @Get('health-indicator')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getHealthIndicator() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveInsightsService.getHealthIndicator(orgId, userId);
  }

  @Get('attendance-correlation')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getAttendanceCorrelation() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.leaveInsightsService.getAttendanceCorrelation(orgId, userId);
  }
}
