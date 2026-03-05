import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamDirectoryService } from './team-directory.service';

@Controller('core-hr/manager/team')
export class TeamDirectoryController {
  constructor(
    private readonly teamDirectoryService: TeamDirectoryService,
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

  @Get('stats')
  @Roles('manager', 'admin', 'super_admin')
  async getTeamStats() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamDirectoryService.getTeamStats(orgId, managerId);
  }

  @Get('history')
  @Roles('manager', 'admin', 'super_admin')
  async getTeamHistory() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamDirectoryService.getTeamHistory(orgId, managerId);
  }

  @Get('export')
  @Roles('manager', 'admin', 'super_admin')
  async exportTeam() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamDirectoryService.exportTeam(orgId, managerId);
  }

  @Get(':userId')
  @Roles('manager', 'admin', 'super_admin')
  async getTeamMember(@Param('userId') userId: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamDirectoryService.getTeamMember(orgId, managerId, userId);
  }

  @Get()
  @Roles('manager', 'admin', 'super_admin')
  async getTeam(
    @Query('location') location?: string,
    @Query('grade') grade?: string,
    @Query('employmentType') employmentType?: string,
    @Query('tenureMin') tenureMin?: string,
    @Query('tenureMax') tenureMax?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamDirectoryService.getTeam(orgId, managerId, {
      location,
      grade,
      employmentType,
      tenureMin: tenureMin ? parseInt(tenureMin, 10) : undefined,
      tenureMax: tenureMax ? parseInt(tenureMax, 10) : undefined,
    });
  }
}
