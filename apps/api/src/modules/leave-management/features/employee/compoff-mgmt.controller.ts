import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CompoffMgmtService } from './compoff-mgmt.service';

@Controller('leave-management/employee/compoff')
export class CompoffMgmtController {
  constructor(
    private readonly compoffMgmtService: CompoffMgmtService,
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
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCompOffs(@Query('status') status?: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.compoffMgmtService.getCompOffs(orgId, userId, status);
  }

  @Post('claim')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async claimCompOff(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.compoffMgmtService.claimCompOff(orgId, userId, body);
  }

  @Get('balance')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getBalance() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.compoffMgmtService.getBalance(orgId, userId);
  }

  @Get('rules')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getRules() {
    const orgId = this.getOrgIdOrThrow();
    return this.compoffMgmtService.getRules(orgId);
  }

  @Get('expiring-soon')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getExpiringSoon() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.compoffMgmtService.getExpiringSoon(orgId, userId);
  }

  @Post('apply-leave')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async applyLeaveWithCompOff(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.compoffMgmtService.applyLeaveWithCompOff(orgId, userId, body);
  }
}
