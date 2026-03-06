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
import { ResourceAllocationService } from './resource-allocation.service';

@Controller('daily-work-logging/manager/resources')
export class ResourceAllocationController {
  constructor(
    private readonly service: ResourceAllocationService,
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
  async getTeamCapacity() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTeamCapacity(orgId, managerId);
  }

  @Post('assign')
  @Roles('super_admin', 'admin', 'manager')
  async assignToProject(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.assignToProject(orgId, managerId, body);
  }

  @Get('workload')
  @Roles('super_admin', 'admin', 'manager')
  async getWorkloadDistribution() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getWorkloadDistribution(orgId, managerId);
  }

  @Get('capacity')
  @Roles('super_admin', 'admin', 'manager')
  async getCapacityPlanning(@Query('weeksAhead') weeksAhead?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    const weeks = weeksAhead ? parseInt(weeksAhead, 10) : undefined;
    return this.service.getCapacityPlanning(orgId, managerId, weeks);
  }
}
