import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ComplianceReportingService } from './compliance-reporting.service';

@Roles('super_admin', 'admin')
@Controller('compliance-audit/admin/reporting')
export class ComplianceReportingController {
  constructor(
    private readonly service: ComplianceReportingService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('dashboard')
  async getComplianceDashboard() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getComplianceDashboard(orgId);
  }

  @Get('training-completion')
  async getTrainingCompletionReport() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTrainingCompletionReport(orgId);
  }

  @Get('policy-acknowledgment')
  async getPolicyAcknowledgmentReport() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPolicyAcknowledgmentReport(orgId);
  }

  @Get('checklist-status')
  async getChecklistStatus() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getChecklistStatus(orgId);
  }

  @Get('regulatory-filings')
  async getRegulatoryFilingsTracker() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRegulatoryFilingsTracker(orgId);
  }
}
