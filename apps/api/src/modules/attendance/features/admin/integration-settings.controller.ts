import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { IntegrationSettingsService } from './integration-settings.service';

@Controller('attendance/admin/integrations')
export class IntegrationSettingsController {
  constructor(
    private readonly integrationSettingsService: IntegrationSettingsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async getSettings() {
    const orgId = this.getOrgIdOrThrow();
    return this.integrationSettingsService.getSettings(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async saveSettings(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.integrationSettingsService.saveSettings(orgId, body);
  }
}
