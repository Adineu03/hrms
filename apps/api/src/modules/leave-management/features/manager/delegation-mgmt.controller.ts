import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DelegationMgmtService } from './delegation-mgmt.service';

@Controller('leave-management/manager/delegations')
export class DelegationMgmtController {
  constructor(
    private readonly delegationMgmtService: DelegationMgmtService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getManagerId(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  async getDelegations() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.delegationMgmtService.getDelegations(orgId, managerId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async createDelegation(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.delegationMgmtService.createDelegation(orgId, managerId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async updateDelegation(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.delegationMgmtService.updateDelegation(orgId, managerId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'manager')
  async cancelDelegation(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.delegationMgmtService.cancelDelegation(orgId, managerId, id);
  }

  @Get('pending-approvals')
  @Roles('super_admin', 'admin', 'manager')
  async getPendingDelegatedApprovals() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.delegationMgmtService.getPendingDelegatedApprovals(orgId, managerId);
  }

  @Post('auto-rules')
  @Roles('super_admin', 'admin', 'manager')
  async setAutoRules(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.delegationMgmtService.setAutoRules(orgId, managerId, body);
  }
}
