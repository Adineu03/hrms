import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PeerBenchmarksService } from './peer-benchmarks.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('people-analytics/employee/peer-benchmarks')
export class PeerBenchmarksController {
  constructor(
    private readonly service: PeerBenchmarksService,
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
  async getBenchmarks() {
    return this.service.getBenchmarks(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
