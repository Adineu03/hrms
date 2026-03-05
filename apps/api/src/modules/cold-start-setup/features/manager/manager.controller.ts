import {
  Controller,
  Get,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ManagerService } from './manager.service';

@Controller('cold-start/manager')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return userId;
  }

  @Get('team')
  @Roles('manager', 'admin', 'super_admin')
  async getTeam() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.managerService.getTeam(orgId, managerId);
  }

  @Get('team/:userId')
  @Roles('manager', 'admin', 'super_admin')
  async getTeamMember(@Param('userId') userId: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.managerService.getTeamMember(orgId, managerId, userId);
  }
}
