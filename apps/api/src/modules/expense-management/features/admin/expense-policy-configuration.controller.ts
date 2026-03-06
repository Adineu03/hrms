import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExpensePolicyConfigurationService } from './expense-policy-configuration.service';

@Roles('super_admin', 'admin')
@Controller('expense-management/admin/policy-configuration')
export class ExpensePolicyConfigurationController {
  constructor(
    private readonly service: ExpensePolicyConfigurationService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  // --- Categories ---

  @Get('categories')
  async listCategories() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listCategories(orgId);
  }

  @Post('categories')
  async createCategory(
    @Body()
    dto: {
      name: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createCategory(orgId, dto);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateCategory(orgId, id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteCategory(orgId, id);
  }

  // --- Policies ---

  @Get('policies')
  async listPolicies() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listPolicies(orgId);
  }

  @Post('policies')
  async createPolicy(
    @Body()
    dto: {
      name: string;
      categoryId?: string;
      maxAmountPerClaim?: string;
      maxAmountPerMonth?: string;
      requiresReceipt?: boolean;
      receiptMinAmount?: string;
      perDiemRate?: string;
      appliesToRole?: string;
      appliesToGrade?: string;
      appliesToDepartment?: string;
      approvalLevels?: number;
      description?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createPolicy(orgId, dto);
  }

  @Patch('policies/:id')
  async updatePolicy(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      categoryId?: string;
      maxAmountPerClaim?: string;
      maxAmountPerMonth?: string;
      requiresReceipt?: boolean;
      receiptMinAmount?: string;
      perDiemRate?: string;
      appliesToRole?: string;
      appliesToGrade?: string;
      appliesToDepartment?: string;
      approvalLevels?: number;
      description?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updatePolicy(orgId, id, dto);
  }

  @Delete('policies/:id')
  async deletePolicy(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deletePolicy(orgId, id);
  }
}
