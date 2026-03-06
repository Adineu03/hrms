import { Body, Controller, Get, Patch, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MobileAccessibilityService } from './mobile-accessibility.service';

@Controller('platform-experience/employee/preferences')
export class MobileAccessibilityController {
  constructor(
    private readonly service: MobileAccessibilityService,
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
  async getPreferences() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPreferences(orgId, userId);
  }

  @Patch()
  async updatePreferences(
    @Body() dto: {
      theme?: string;
      locale?: string;
      timezone?: string;
      dateFormat?: string;
      accessibilitySettings?: Record<string, unknown>;
      displayPrefs?: Record<string, unknown>;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updatePreferences(orgId, userId, dto);
  }

  @Get('themes')
  async getAvailableThemes() {
    return this.service.getAvailableThemes();
  }

  @Get('locales')
  async getAvailableLocales() {
    return this.service.getAvailableLocales();
  }
}
