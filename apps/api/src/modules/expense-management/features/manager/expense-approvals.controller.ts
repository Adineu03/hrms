import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExpenseApprovalsService } from './expense-approvals.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('expense-management/manager/approvals')
export class ExpenseApprovalsController {
  constructor(
    private readonly service: ExpenseApprovalsService,
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
  async listPendingApprovals() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listPendingApprovals(orgId, userId);
  }

  @Get(':id')
  async getReportDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getReportDetail(orgId, userId, id);
  }

  @Post(':id/approve')
  async approveReport(
    @Param('id') id: string,
    @Body() dto: { comments?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.approveReport(orgId, id, userId, dto.comments);
  }

  @Post(':id/reject')
  async rejectReport(
    @Param('id') id: string,
    @Body() dto: { reason: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.rejectReport(orgId, id, userId, dto.reason);
  }

  @Post(':id/return')
  async returnReport(
    @Param('id') id: string,
    @Body() dto: { comments: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.returnReport(orgId, id, userId, dto.comments);
  }
}
