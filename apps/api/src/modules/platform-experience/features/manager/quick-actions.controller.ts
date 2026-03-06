import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { QuickActionsService } from './quick-actions.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('platform-experience/manager/quick-actions')
export class QuickActionsController {
  constructor(
    private readonly service: QuickActionsService,
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
  async getQuickActions() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getQuickActions(orgId, userId);
  }

  @Get('recent')
  async getRecentItems() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getRecentItems(orgId, userId);
  }

  @Post('bulk-approve')
  async bulkApprove(@Body() dto: { type: string; ids: string[] }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.bulkApprove(orgId, userId, dto);
  }

  @Get('pending-approvals')
  async getPendingApprovals() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPendingApprovals(orgId, userId);
  }
}
