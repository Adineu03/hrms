import { Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExpenseTrackingService } from './expense-tracking.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('expense-management/employee/tracking')
export class ExpenseTrackingController {
  constructor(
    private readonly service: ExpenseTrackingService,
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

  @Get('history')
  async getExpenseHistory(
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getExpenseHistory(orgId, userId, { status, category });
  }

  @Get('summary')
  async getExpenseSummary() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getExpenseSummary(orgId, userId);
  }

  @Post('duplicate/:id')
  async duplicateReport(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.duplicateReport(orgId, userId, id);
  }
}
