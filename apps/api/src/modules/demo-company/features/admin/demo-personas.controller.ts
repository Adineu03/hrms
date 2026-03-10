import { Controller, Get, Post, Param, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DemoPersonasService } from './demo-personas.service';

@Roles('super_admin', 'admin')
@Controller('demo-company/admin/demo-personas')
export class DemoPersonasController {
  constructor(
    private readonly service: DemoPersonasService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getPersonas() {
    return this.service.getPersonas(this.getOrgIdOrThrow());
  }

  @Post(':persona/reset-password')
  async resetPersonaPassword(@Param('persona') persona: string) {
    return this.service.resetPersonaPassword(this.getOrgIdOrThrow(), persona);
  }

  @Get(':persona/session')
  async getPersonaSession(@Param('persona') persona: string) {
    return this.service.getPersonaSession(this.getOrgIdOrThrow(), persona);
  }
}
