import { Body, Controller, Get, Patch, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SelfServicePortalService } from './self-service-portal.service';

@Controller('platform-experience/employee/self-service')
export class SelfServicePortalController {
  constructor(
    private readonly service: SelfServicePortalService,
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

  @Get('summary')
  async getRequestSummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getRequestSummary(orgId, userId);
  }

  @Get('requests')
  async listRequests() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listRequests(orgId, userId);
  }

  @Get('documents')
  async listDocuments() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listDocuments(orgId, userId);
  }

  @Get('settings')
  async getSettings() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getSettings(orgId, userId);
  }

  @Patch('settings')
  async updateSettings(@Body() dto: { displayPrefs?: Record<string, unknown>; accessibilitySettings?: Record<string, unknown> }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateSettings(orgId, userId, dto);
  }
}
