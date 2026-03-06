import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { EmployeeReferralService } from './employee-referral.service';

@Controller('talent-acquisition/employee/referrals')
export class EmployeeReferralController {
  constructor(
    private readonly service: EmployeeReferralService,
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

  @Get('eligible')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getEligiblePositions() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getEligiblePositions(orgId);
  }

  @Get('bonus')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getBonusStatus() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getBonusStatus(orgId, userId);
  }

  @Get('leaderboard')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getLeaderboard() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getLeaderboard(orgId);
  }

  @Get('history')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getReferralHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getReferralHistory(orgId, userId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitReferral(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitReferral(orgId, userId, body);
  }

  @Get()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getMyReferrals() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyReferrals(orgId, userId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getReferralDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getReferralDetail(orgId, userId, id);
  }
}
