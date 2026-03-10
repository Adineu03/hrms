import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DataPrivacyGdprService } from './data-privacy-gdpr.service';

@Roles('super_admin', 'admin')
@Controller('compliance-audit/admin/data-privacy')
export class DataPrivacyGdprController {
  constructor(
    private readonly service: DataPrivacyGdprService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('summary')
  async getPrivacySummary() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPrivacySummary(orgId);
  }

  @Get('audit-configs')
  async listRetentionConfigs() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listRetentionConfigs(orgId);
  }

  @Get('dsar-requests')
  async listDsarRequests() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listDsarRequests(orgId);
  }

  @Get('breach-notifications')
  async listBreachNotifications() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listBreachNotifications(orgId);
  }
}
