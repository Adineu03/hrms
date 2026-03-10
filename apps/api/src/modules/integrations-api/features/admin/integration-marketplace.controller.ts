import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { IntegrationMarketplaceService } from './integration-marketplace.service';

@Roles('super_admin', 'admin')
@Controller('integrations-api/admin/integration-marketplace')
export class IntegrationMarketplaceController {
  constructor(
    private readonly service: IntegrationMarketplaceService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listConnectors() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listConnectors(orgId);
  }

  @Post()
  async createConnector(
    @Body()
    dto: {
      connectorKey: string;
      connectorName: string;
      category: string;
      description?: string;
      authType?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createConnector(orgId, dto);
  }

  @Get(':id')
  async getConnector(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getConnector(orgId, id);
  }

  @Patch(':id/enable')
  async enableConnector(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.enableConnector(orgId, id);
  }

  @Patch(':id/disable')
  async disableConnector(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.disableConnector(orgId, id);
  }

  @Post(':id/reauth')
  async reauthConnector(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.reauthConnector(orgId, id);
  }

  @Get(':id/logs')
  async getConnectorLogs(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getConnectorLogs(orgId, id);
  }
}
