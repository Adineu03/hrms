import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PayslipService } from './payslip.service';

@Controller('core-hr/employee/payslip')
export class PayslipController {
  constructor(
    private readonly payslipService: PayslipService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get('salary-structure')
  async getSalaryStructure() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.payslipService.getSalaryStructure(orgId, userId);
  }

  @Get('tax-summary')
  async getTaxSummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.payslipService.getTaxSummary(orgId, userId);
  }

  @Get('history')
  async getHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.payslipService.getHistory(orgId, userId);
  }
}
