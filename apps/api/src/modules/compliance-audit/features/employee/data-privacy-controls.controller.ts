import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DataPrivacyControlsService } from './data-privacy-controls.service';

@Controller('compliance-audit/employee/data-privacy')
export class DataPrivacyControlsController {
  constructor(
    private readonly service: DataPrivacyControlsService,
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

  @Get('my-data')
  async getMyPersonalData() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyPersonalData(orgId, userId);
  }

  @Post('data-export')
  async requestDataExport() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.requestDataExport(orgId, userId);
  }

  @Post('correction-request')
  async submitCorrectionRequest(
    @Body() dto: { field: string; currentValue: string; requestedValue: string; reason: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitCorrectionRequest(orgId, userId, dto);
  }

  @Post('consent')
  async updateConsent(
    @Body() dto: { consentType: string; granted: boolean },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateConsent(orgId, userId, dto);
  }

  @Post('deletion-request')
  async requestDeletion(
    @Body() dto: { reason: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.requestDeletion(orgId, userId, dto);
  }
}
