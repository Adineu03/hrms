import {
  Controller,
  Get,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CompensationService } from './compensation.service';

@Controller('core-hr/manager/compensation')
export class CompensationController {
  constructor(
    private readonly compensationService: CompensationService,
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

  @Get('summary')
  @Roles('manager', 'admin', 'super_admin')
  async getSummary() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.compensationService.getSummary(orgId, managerId);
  }

  @Get('history/:userId')
  @Roles('manager', 'admin', 'super_admin')
  async getHistory(@Param('userId') userId: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.compensationService.getHistory(orgId, managerId, userId);
  }
}
