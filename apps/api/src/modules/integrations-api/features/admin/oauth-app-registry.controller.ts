import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OauthAppRegistryService } from './oauth-app-registry.service';

@Roles('super_admin', 'admin')
@Controller('integrations-api/admin/oauth-app-registry')
export class OauthAppRegistryController {
  constructor(
    private readonly service: OauthAppRegistryService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listApps() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listApps(orgId);
  }

  @Post()
  async createApp(
    @Body()
    dto: {
      appName: string;
      clientId: string;
      clientSecretHash: string;
      redirectUris: string[];
      scopes: string[];
      description?: string;
      logoUrl?: string;
      ownerEmail?: string;
      isPublic?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createApp(orgId, dto);
  }

  @Get(':id')
  async getApp(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getApp(orgId, id);
  }

  @Patch(':id')
  async updateApp(
    @Param('id') id: string,
    @Body()
    dto: {
      appName?: string;
      redirectUris?: string[];
      scopes?: string[];
      description?: string;
      logoUrl?: string;
      ownerEmail?: string;
      isPublic?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateApp(orgId, id, dto);
  }

  @Post(':id/revoke')
  async revokeApp(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.revokeApp(orgId, id);
  }
}
