import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { WebhookConfigurationService } from './webhook-configuration.service';

@Roles('super_admin', 'admin')
@Controller('integrations-api/admin/webhook-configuration')
export class WebhookConfigurationController {
  constructor(
    private readonly service: WebhookConfigurationService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listWebhooks() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listWebhooks(orgId);
  }

  @Post()
  async createWebhook(
    @Body()
    dto: {
      name: string;
      endpointUrl: string;
      eventType: string;
      secret?: string;
      payloadFormat?: string;
      isEnabled?: boolean;
      retryPolicy?: Record<string, unknown>;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createWebhook(orgId, dto);
  }

  @Get(':id')
  async getWebhook(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getWebhook(orgId, id);
  }

  @Patch(':id')
  async updateWebhook(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      endpointUrl?: string;
      eventType?: string;
      secret?: string;
      payloadFormat?: string;
      isEnabled?: boolean;
      retryPolicy?: Record<string, unknown>;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateWebhook(orgId, id, dto);
  }

  @Delete(':id')
  async deleteWebhook(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteWebhook(orgId, id);
  }

  @Post(':id/enable')
  async enableWebhook(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.enableWebhook(orgId, id);
  }

  @Post(':id/disable')
  async disableWebhook(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.disableWebhook(orgId, id);
  }

  @Post(':id/ping')
  async pingWebhook(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.pingWebhook(orgId, id);
  }
}
