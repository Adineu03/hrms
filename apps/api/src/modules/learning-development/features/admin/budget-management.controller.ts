import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { BudgetManagementService } from './budget-management.service';

@Controller('learning-development/admin/budgets')
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
  @Roles('super_admin', 'admin')
  async list(
    @Query('departmentId') departmentId?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('type') type?: string,
  ) {
    return this.service.listBudgets(this.getOrgIdOrThrow(), { departmentId, fiscalYear, type });
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    return this.service.createBudget(this.getOrgIdOrThrow(), body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.updateBudget(this.getOrgIdOrThrow(), id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    return this.service.deleteBudget(this.getOrgIdOrThrow(), id);
  }

  @Get('summary')
  @Roles('super_admin', 'admin')
  async getSummary(@Query('fiscalYear') fiscalYear?: string) {
    return this.service.getBudgetSummary(this.getOrgIdOrThrow(), fiscalYear);
  }
}
