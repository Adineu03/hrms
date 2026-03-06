import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SalaryStructureService } from './salary-structure.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('payroll-processing/employee/salary')
export class SalaryStructureController {
  constructor(
    private readonly service: SalaryStructureService,
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

  @Get('current')
  async getCurrentSalary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCurrentSalary(orgId, userId);
  }

  @Get('history')
  async getSalaryHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getSalaryHistory(orgId, userId);
  }

  @Get('compensation-letter')
  async getCompensationLetter() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCompensationLetter(orgId, userId);
  }

  @Get('benefits')
  async getBenefitsSummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getBenefitsSummary(orgId, userId);
  }
}
