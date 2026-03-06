import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamProductivityService } from './team-productivity.service';

@Controller('daily-work-logging/manager/productivity')
export class TeamProductivityController {
  constructor(
    private readonly service: TeamProductivityService,
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
  async getProductivityMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getProductivityMetrics(orgId, managerId, startDate, endDate);
  }

  @Get('utilization')
  @Roles('super_admin', 'admin', 'manager')
  async getUtilizationRate(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getUtilizationRate(orgId, managerId, startDate, endDate);
  }

  @Get('idle-time')
  @Roles('super_admin', 'admin', 'manager')
  async getIdleTimeAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getIdleTimeAnalysis(orgId, managerId, startDate, endDate);
  }

  @Get('comparison')
  @Roles('super_admin', 'admin', 'manager')
  async getComparison(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getComparison(orgId, managerId, startDate, endDate);
  }
}
