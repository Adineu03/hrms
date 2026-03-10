import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ApiKeyManagementService } from './api-key-management.service';

@Roles('super_admin', 'admin')
@Controller('integrations-api/admin/api-key-management')
export class ApiKeyManagementController {
  constructor(
    private readonly service: ApiKeyManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async listApiKeys() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listApiKeys(orgId);
  }

  @Post()
  async createApiKey(
    @Body()
    dto: {
      name: string;
      scopes: string[];
      expiresAt?: string;
      rateLimitPerMin?: number;
      ipWhitelist?: string[];
      rotationReminderDays?: number;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createApiKey(orgId, dto, userId);
  }

  @Get(':id')
  async getApiKey(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getApiKey(orgId, id);
  }

  @Post(':id/revoke')
  async revokeApiKey(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.revokeApiKey(orgId, id, userId);
  }

  @Post(':id/rotate')
  async rotateApiKey(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.rotateApiKey(orgId, id, userId);
  }
}
