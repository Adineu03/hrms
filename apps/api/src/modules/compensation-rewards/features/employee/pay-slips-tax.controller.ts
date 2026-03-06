import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PaySlipsTaxService } from './pay-slips-tax.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('compensation-rewards/employee/pay-slips')
export class PaySlipsTaxController {
  constructor(
    private readonly service: PaySlipsTaxService,
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
  async listPaySlips() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listPaySlips(orgId, userId);
  }

  @Get(':id/download')
  async downloadPaySlip(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.downloadPaySlip(orgId, userId, id);
  }

  @Get('tax-computation')
  async getTaxComputation() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTaxComputation(orgId, userId);
  }

  @Get('investment-declaration')
  async getInvestmentDeclaration() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getInvestmentDeclaration(orgId, userId);
  }

  @Post('investment-declaration')
  async submitInvestmentDeclaration(@Body() dto: {
    fiscalYear: string;
    taxRegime?: string;
    section80c?: any;
    section80d?: any;
    hraExemption?: any;
    otherDeductions?: any;
    totalDeclared?: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitInvestmentDeclaration(orgId, userId, dto);
  }

  @Get('tax-regime')
  async getTaxRegime() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTaxRegime(orgId, userId);
  }

  @Post('tax-regime')
  async selectTaxRegime(@Body() dto: { taxRegime: 'old' | 'new'; fiscalYear: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.selectTaxRegime(orgId, userId, dto);
  }
}
