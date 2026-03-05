import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { AttendancePoliciesService } from './attendance-policies.service';

@Controller('attendance/admin/policies')
export class AttendancePoliciesController {
  constructor(
    private readonly attendancePoliciesService: AttendancePoliciesService,
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
    return this.attendancePoliciesService.getPolicy(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async upsertPolicy(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendancePoliciesService.upsertPolicy(orgId, body);
  }
}
