import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../multi-tenancy/tenant.service';
import { StatsService } from './stats.service';

@Controller('dashboard')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('stats')
  async getStats() {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return this.statsService.getOrgStats(orgId);
  }
}
