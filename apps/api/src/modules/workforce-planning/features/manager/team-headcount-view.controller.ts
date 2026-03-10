import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamHeadcountViewService } from './team-headcount-view.service';

@Roles('manager', 'super_admin', 'admin')
@Controller('workforce-planning/manager/team-headcount')
export class TeamHeadcountViewController {
  constructor(
    private readonly service: TeamHeadcountViewService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getTeamHeadcount() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTeamHeadcount(orgId);
  }

  @Get('open-positions')
  async getOpenPositions() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getOpenPositions(orgId);
  }
}
