import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { BudgetManagementService } from './budget-management.service';

@Roles('super_admin', 'admin')
@Controller('workforce-planning/admin/budget-management')
export class BudgetManagementController {
  constructor(
    private readonly service: BudgetManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listBudgets() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listBudgets(orgId);
  }

  @Post()
  async createBudget(
    @Body()
    dto: {
      budgetName: string;
      budgetYear: number;
      departmentId?: string;
      costCenter?: string;
      allocatedAmount: number;
      currency?: string;
      notes?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createBudget(orgId, dto);
  }

  @Get(':id')
  async getBudget(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getBudget(orgId, id);
  }

  @Patch(':id')
  async updateBudget(
    @Param('id') id: string,
    @Body()
    dto: {
      actualSpend?: number;
      projectedSpend?: number;
      salaryIncreasePool?: number;
      benefitsCostProjected?: number;
      fteCount?: number;
      status?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateBudget(orgId, id, dto);
  }

  @Delete(':id')
  async deleteBudget(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteBudget(orgId, id);
  }

  @Post(':id/approve')
  async approveBudget(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.approveBudget(orgId, id);
  }
}
