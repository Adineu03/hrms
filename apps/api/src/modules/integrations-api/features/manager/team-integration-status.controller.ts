import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamIntegrationStatusService } from './team-integration-status.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('integrations-api/manager/team-integration-status')
export class TeamIntegrationStatusController {
  constructor(
    private readonly service: TeamIntegrationStatusService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listTeamIntegrations() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listTeamIntegrations(orgId);
  }

  @Post(':id/flag-error')
  async flagSyncError(
    @Param('id') id: string,
    @Body() dto: { message: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.flagSyncError(orgId, id, dto.message);
  }
}
