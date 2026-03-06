import {
  Controller,
  Get,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ProjectTrackingService } from './project-tracking.service';

@Controller('daily-work-logging/manager/projects')
export class ProjectTrackingController {
  constructor(
    private readonly service: ProjectTrackingService,
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
  async getProjectTimeAllocation() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getProjectTimeAllocation(orgId, managerId);
  }

  @Get('billable')
  @Roles('super_admin', 'admin', 'manager')
  async getBillableTracking() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getBillableTracking(orgId, managerId);
  }

  @Get(':id/budget')
  @Roles('super_admin', 'admin', 'manager')
  async getProjectBudget(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getProjectBudget(orgId, managerId, id);
  }

  @Get(':id/members')
  @Roles('super_admin', 'admin', 'manager')
  async getProjectMemberBreakdown(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getProjectMemberBreakdown(orgId, managerId, id);
  }
}
