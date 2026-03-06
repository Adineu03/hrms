import { Controller, Get, Param, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyPayslipsService } from './my-payslips.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('payroll-processing/employee/payslips')
export class MyPayslipsController {
  constructor(
    private readonly service: MyPayslipsService,
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
  async listPayslips(@Query('year') year?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listPayslips(orgId, userId, year ? parseInt(year, 10) : undefined);
  }

  @Get('ytd-summary')
  async getYtdSummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getYtdSummary(orgId, userId);
  }

  @Get('comparison')
  async getPayslipComparison() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPayslipComparison(orgId, userId);
  }

  @Get(':id')
  async getPayslipDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPayslipDetail(orgId, userId, id);
  }

  @Get(':id/download')
  async downloadPayslip(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.downloadPayslip(orgId, userId, id);
  }
}
