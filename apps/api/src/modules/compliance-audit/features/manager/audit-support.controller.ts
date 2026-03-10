import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { AuditSupportService } from './audit-support.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('compliance-audit/manager/audit-support')
export class AuditSupportController {
  constructor(
    private readonly service: AuditSupportService,
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

  @Get('team-report')
  async generateTeamComplianceReport() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.generateTeamComplianceReport(orgId, userId);
  }

  @Get('certifications')
  async getTeamCertifications() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamCertifications(orgId, userId);
  }

  @Get('evidence')
  async getEvidenceDashboard() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getEvidenceDashboard(orgId, userId);
  }
}
