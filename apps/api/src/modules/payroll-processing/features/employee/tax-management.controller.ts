import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TaxManagementService } from './tax-management.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('payroll-processing/employee/tax')
export class TaxManagementController {
  constructor(
    private readonly service: TaxManagementService,
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

  @Get('declarations')
  async listDeclarations() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listDeclarations(orgId, userId);
  }

  @Post('declarations')
  async createDeclaration(
    @Body()
    dto: {
      fiscalYear: string;
      taxRegime: string;
      section80c?: Record<string, any>;
      section80d?: Record<string, any>;
      hraExemption?: Record<string, any>;
      otherDeductions?: Record<string, any>;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createDeclaration(orgId, userId, dto);
  }

  @Patch('declarations/:id')
  async updateDeclaration(
    @Param('id') id: string,
    @Body()
    dto: {
      taxRegime?: string;
      section80c?: Record<string, any>;
      section80d?: Record<string, any>;
      hraExemption?: Record<string, any>;
      otherDeductions?: Record<string, any>;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateDeclaration(orgId, userId, id, dto);
  }

  @Get('declarations/:id')
  async getDeclarationDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getDeclarationDetail(orgId, userId, id);
  }

  @Post('proofs')
  async submitTaxProof(
    @Body()
    dto: {
      declarationId: string;
      section: string;
      description: string;
      declaredAmount?: string;
      proofAmount?: string;
      documentUrl?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitTaxProof(orgId, userId, dto);
  }

  @Get('proofs')
  async listTaxProofs() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listTaxProofs(orgId, userId);
  }

  @Get('computation')
  async getTaxComputation() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTaxComputation(orgId, userId);
  }

  @Get('form16')
  async getForm16() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getForm16(orgId, userId);
  }
}
