import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ProductivityDashboardService } from './productivity-dashboard.service';

@Controller('daily-work-logging/employee/productivity')
export class ProductivityDashboardController {
  constructor(
    private readonly productivityDashboardService: ProductivityDashboardService,
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
  async getProductivitySummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.productivityDashboardService.getProductivitySummary(orgId, userId, { from, to });
  }

  @Get('category-breakdown')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCategoryBreakdown(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.productivityDashboardService.getCategoryBreakdown(orgId, userId, { from, to });
  }

  @Get('weekly-trend')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getWeeklyTrend(
    @Query('weeks') weeks?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.productivityDashboardService.getWeeklyTrend(orgId, userId, { weeks, from, to });
  }

  @Get('utilization')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getUtilization(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.productivityDashboardService.getUtilization(orgId, userId, { from, to });
  }
}
