import {
  Controller,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { AttendanceInsightsService } from './attendance-insights.service';

@Controller('attendance/employee/insights')
export class AttendanceInsightsController {
  constructor(
    private readonly insightsService: AttendanceInsightsService,
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

  @Get('punctuality')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPunctuality() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.insightsService.getPunctuality(orgId, userId);
  }

  @Get('work-hours')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getWorkHours() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.insightsService.getWorkHours(orgId, userId);
  }

  @Get('streak')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getStreak() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.insightsService.getStreak(orgId, userId);
  }

  @Get('break-analysis')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getBreakAnalysis() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.insightsService.getBreakAnalysis(orgId, userId);
  }

  @Get('achievements')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getAchievements() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.insightsService.getAchievements(orgId, userId);
  }
}
