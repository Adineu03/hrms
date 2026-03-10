import { Controller, Get, Post, Body, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SeedDataControlService } from './seed-data-control.service';

@Roles('super_admin', 'admin')
@Controller('demo-company/admin/seed-data-control')
export class SeedDataControlController {
  constructor(
    private readonly service: SeedDataControlService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getSeedStatus() {
    return this.service.getSeedStatus(this.getOrgIdOrThrow());
  }

  @Post('trigger')
  async triggerSeed(@Body() body: { modules: string[]; dateRangeDays: number }) {
    return this.service.triggerSeed(this.getOrgIdOrThrow(), body);
  }

  @Get('log')
  async getSeedLog() {
    return this.service.getSeedLog(this.getOrgIdOrThrow());
  }
}
