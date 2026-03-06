import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PayrollApprovalsService } from './payroll-approvals.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('payroll-processing/manager/approvals')
export class PayrollApprovalsController {
  constructor(
    private readonly service: PayrollApprovalsService,
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

  @Get('pending')
  async getPendingApprovals() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPendingApprovals(orgId, userId);
  }

  @Post('approve/:type/:id')
  async approveItem(@Param('type') type: string, @Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.approveItem(orgId, userId, type, id);
  }

  @Post('reject/:type/:id')
  async rejectItem(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: { remarks?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.rejectItem(orgId, userId, type, id, dto.remarks);
  }

  @Get('history')
  async getApprovalHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getApprovalHistory(orgId, userId);
  }
}
