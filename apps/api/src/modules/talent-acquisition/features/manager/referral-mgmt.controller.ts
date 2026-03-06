import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ReferralMgmtService } from './referral-mgmt.service';

@Controller('talent-acquisition/manager/referrals')
export class ReferralMgmtController {
  constructor(
    private readonly service: ReferralMgmtService,
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
  async listMyReferrals() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listMyReferrals(orgId, managerId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async submitReferral(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.submitReferral(orgId, managerId, body);
  }

  @Get('team')
  @Roles('super_admin', 'admin', 'manager')
  async getTeamReferrals() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTeamReferrals(orgId, managerId);
  }

  @Get('bonus')
  @Roles('super_admin', 'admin', 'manager')
  async getReferralBonusEligibility() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getReferralBonusEligibility(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getReferralDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getReferralDetail(orgId, managerId, id);
  }
}
