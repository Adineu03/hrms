import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PayrollConfigurationService } from './payroll-configuration.service';

@Roles('super_admin', 'admin')
@Controller('payroll-processing/admin/configuration')
export class PayrollConfigurationController {
  constructor(
    private readonly service: PayrollConfigurationService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('components')
  async listComponents() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listComponents(orgId);
  }

  @Post('components')
  async createComponent(
    @Body()
    dto: {
      name: string;
      type: string;
      category: string;
      calculationType: string;
      calculationValue?: string;
      percentageOf?: string;
      isStatutory?: boolean;
      isTaxable?: boolean;
      sortOrder?: number;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createComponent(orgId, dto);
  }

  @Patch('components/:id')
  async updateComponent(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      type?: string;
      category?: string;
      calculationType?: string;
      calculationValue?: string;
      percentageOf?: string;
      isStatutory?: boolean;
      isTaxable?: boolean;
      sortOrder?: number;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateComponent(orgId, id, dto);
  }

  @Delete('components/:id')
  async deleteComponent(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteComponent(orgId, id);
  }

  @Get('config')
  async getConfig() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getConfig(orgId);
  }

  @Post('config')
  async upsertConfig(
    @Body()
    dto: {
      payrollCycleDay?: number;
      paymentDay?: number;
      taxRegime?: string;
      pfEnabled?: boolean;
      pfEmployerRate?: string;
      pfEmployeeRate?: string;
      esiEnabled?: boolean;
      esiEmployerRate?: string;
      esiEmployeeRate?: string;
      ptEnabled?: boolean;
      lwfEnabled?: boolean;
      autoProcessEnabled?: boolean;
      approvalRequired?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.upsertConfig(orgId, dto);
  }
}
