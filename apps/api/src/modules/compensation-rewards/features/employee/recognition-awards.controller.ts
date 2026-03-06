import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { RecognitionAwardsService } from './recognition-awards.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('compensation-rewards/employee/recognition')
export class RecognitionAwardsController {
  constructor(
    private readonly service: RecognitionAwardsService,
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

  @Get('received')
  async getRecognitionsReceived() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getRecognitionsReceived(orgId, userId);
  }

  @Get('wall')
  async getRecognitionWall() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRecognitionWall(orgId);
  }

  @Post('nominate')
  async nominatePeer(@Body() dto: { programId: string; nomineeId: string; category?: string; reason: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.nominatePeer(orgId, userId, dto);
  }

  @Get('points')
  async getPointsBalance() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPointsBalance(orgId, userId);
  }

  @Get('points/transactions')
  async getPointTransactions() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPointTransactions(orgId, userId);
  }

  @Post('points/redeem')
  async redeemPoints(@Body() dto: { points: number; redeemedItem: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.redeemPoints(orgId, userId, dto);
  }
}
