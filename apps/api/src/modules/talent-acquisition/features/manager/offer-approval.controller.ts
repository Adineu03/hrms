import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OfferApprovalService } from './offer-approval.service';

@Controller('talent-acquisition/manager/offers')
export class OfferApprovalController {
  constructor(
    private readonly service: OfferApprovalService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  async listPendingApprovals() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listPendingApprovals(orgId, managerId);
  }

  @Get('tracking')
  @Roles('super_admin', 'admin', 'manager')
  async trackAcceptanceStatus() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.trackAcceptanceStatus(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getOfferDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getOfferDetail(orgId, managerId, id);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'admin', 'manager')
  async approveOffer(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.approveOffer(orgId, managerId, id, body);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'admin', 'manager')
  async rejectOffer(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.rejectOffer(orgId, managerId, id, body);
  }

  @Post(':id/counter')
  @Roles('super_admin', 'admin', 'manager')
  async suggestCounterOffer(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.suggestCounterOffer(orgId, managerId, id, body);
  }
}
