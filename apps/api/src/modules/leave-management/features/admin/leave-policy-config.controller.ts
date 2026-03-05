import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeavePolicyConfigService } from './leave-policy-config.service';

@Controller('leave-management/admin/policy')
export class LeavePolicyConfigController {
  constructor(
    private readonly leavePolicyConfigService: LeavePolicyConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async getPolicy() {
    const orgId = this.getOrgIdOrThrow();
    return this.leavePolicyConfigService.getPolicy(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async upsertPolicy(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.leavePolicyConfigService.upsertPolicy(orgId, body);
  }
}
