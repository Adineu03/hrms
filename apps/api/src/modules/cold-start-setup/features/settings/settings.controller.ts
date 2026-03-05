import {
  Controller,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SettingsService } from './settings.service';

@Controller('cold-start/settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return orgId;
  }

  @Get('dashboard')
  @Roles('super_admin', 'admin')
  async getDashboard() {
    const orgId = this.getOrgIdOrThrow();
    return this.settingsService.getDashboard(orgId);
  }
}
