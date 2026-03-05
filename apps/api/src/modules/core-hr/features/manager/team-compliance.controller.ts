import {
  Controller,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamComplianceService } from './team-compliance.service';

@Controller('core-hr/manager/compliance')
export class TeamComplianceController {
  constructor(
    private readonly teamComplianceService: TeamComplianceService,
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
  @Roles('manager', 'admin', 'super_admin')
  async getOverview() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamComplianceService.getOverview(orgId, managerId);
  }

  @Get('gaps')
  @Roles('manager', 'admin', 'super_admin')
  async getGaps() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamComplianceService.getGaps(orgId, managerId);
  }
}
