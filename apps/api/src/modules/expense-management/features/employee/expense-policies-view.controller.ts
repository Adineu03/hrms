import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExpensePoliciesViewService } from './expense-policies-view.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('expense-management/employee/policies')
export class ExpensePoliciesViewController {
  constructor(
    private readonly service: ExpensePoliciesViewService,
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
  async listApplicablePolicies() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listApplicablePolicies(orgId, userId);
  }

  @Get('categories')
  async listCategories() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listCategories(orgId);
  }

  @Get('limits')
  async getSpendingLimits() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getSpendingLimits(orgId, userId);
  }
}
