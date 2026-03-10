import { Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ConnectedAppsService } from './connected-apps.service';

@Controller('integrations-api/employee/connected-apps')
export class ConnectedAppsController {
  constructor(
    private readonly service: ConnectedAppsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const id = this.tenantService.getUserId?.();
    if (!id) throw new UnauthorizedException('Missing user context');
    return id;
  }

  @Get()
  async listConnectedApps() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listConnectedApps(orgId, userId);
  }

  @Post(':id/revoke')
  async revokeAppAccess(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.revokeAppAccess(orgId, id, userId);
  }
}
