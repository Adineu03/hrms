import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TimesheetPolicyConfigService } from './timesheet-policy-config.service';

@Controller('daily-work-logging/admin/policy')
export class TimesheetPolicyConfigController {
  constructor(
    private readonly timesheetPolicyConfigService: TimesheetPolicyConfigService,
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
    return this.timesheetPolicyConfigService.getPolicy(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async upsertPolicy(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.timesheetPolicyConfigService.upsertPolicy(orgId, body);
  }
}
