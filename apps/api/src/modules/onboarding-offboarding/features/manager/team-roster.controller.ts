import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamRosterService } from './team-roster.service';

/**
 * Shared manager roster endpoints consumed by the Buddy Assignment, Knowledge
 * Transfer and Exit Interview tabs. Hosted on the bare `manager` base path so
 * the frontend's `manager/team-members`, `manager/new-hires` and
 * `manager/departing-employees` calls resolve.
 */
@Controller('onboarding-offboarding/manager')
export class TeamRosterController {
  constructor(
    private readonly service: TeamRosterService,
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

  @Get('team-members')
  @Roles('super_admin', 'admin', 'manager')
  async listTeamMembers() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listTeamMembers(orgId, managerId);
  }

  @Get('new-hires')
  @Roles('super_admin', 'admin', 'manager')
  async listNewHires() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listNewHires(orgId, managerId);
  }

  @Get('departing-employees')
  @Roles('super_admin', 'admin', 'manager')
  async listDepartingEmployees() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listDepartingEmployees(orgId, managerId);
  }
}
