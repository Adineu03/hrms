import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LaborLawComplianceService } from './labor-law-compliance.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('compliance-audit/manager/labor-law')
export class LaborLawComplianceController {
  constructor(
    private readonly service: LaborLawComplianceService,
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

  @Get('working-hours')
  async getWorkingHoursCompliance() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getWorkingHoursCompliance(orgId, userId);
  }

  @Get('leave-compliance')
  async getLeaveCompliance() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getLeaveCompliance(orgId, userId);
  }

  @Get('health-safety')
  async getHealthSafetyChecklists() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getHealthSafetyChecklists(orgId, userId);
  }

  @Get('contractor-classification')
  async getContractorClassification() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getContractorClassification(orgId, userId);
  }
}
