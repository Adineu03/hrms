import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ClockService } from './clock.service';

@Controller('attendance/employee/clock')
export class ClockController {
  constructor(
    private readonly clockService: ClockService,
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

  @Post('in')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async clockIn(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.clockService.clockIn(orgId, userId, body);
  }

  @Post('out')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async clockOut(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.clockService.clockOut(orgId, userId, body);
  }

  @Get('status')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getStatus() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.clockService.getStatus(orgId, userId);
  }

  @Post('break/start')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async startBreak(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.clockService.startBreak(orgId, userId, body);
  }

  @Post('break/end')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async endBreak() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.clockService.endBreak(orgId, userId);
  }
}
