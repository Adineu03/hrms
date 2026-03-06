import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PayrollReportsService } from './payroll-reports.service';

@Roles('super_admin', 'admin')
@Controller('payroll-processing/admin/reports')
export class PayrollReportsController {
  constructor(
    private readonly service: PayrollReportsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('summary')
  async getPayrollSummary(@Query('month') month: string, @Query('year') year: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPayrollSummary(orgId, parseInt(month, 10), parseInt(year, 10));
  }

  @Get('department-breakdown')
  async getDepartmentBreakdown(@Query('month') month: string, @Query('year') year: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getDepartmentBreakdown(orgId, parseInt(month, 10), parseInt(year, 10));
  }

  @Get('salary-register')
  async getSalaryRegister(@Query('month') month: string, @Query('year') year: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSalaryRegister(orgId, parseInt(month, 10), parseInt(year, 10));
  }

  @Get('variance')
  async getVarianceAnalysis(@Query('month') month: string, @Query('year') year: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getVarianceAnalysis(orgId, parseInt(month, 10), parseInt(year, 10));
  }

  @Get('compliance')
  async getComplianceReport() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getComplianceReport(orgId);
  }

  @Get('year-end')
  async getYearEndReconciliation(@Query('year') year: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getYearEndReconciliation(orgId, parseInt(year, 10));
  }
}
