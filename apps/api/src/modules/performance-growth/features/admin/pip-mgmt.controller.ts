import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PipMgmtService } from './pip-mgmt.service';

@Controller('performance-growth/admin/pip')
export class PipMgmtController {
  constructor(private readonly service: PipMgmtService, private readonly tenantService: TenantService) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(@Query('status') status?: string) { return this.service.listPIPs(this.getOrgIdOrThrow(), status); }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    return this.service.createPIP(this.getOrgIdOrThrow(), this.tenantService.getUserId?.() ?? this.getOrgIdOrThrow(), body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) { return this.service.getPIP(this.getOrgIdOrThrow(), id); }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.updatePIP(this.getOrgIdOrThrow(), id, body); }

  @Post(':id/escalate')
  @Roles('super_admin', 'admin')
  async escalate(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.escalatePIP(this.getOrgIdOrThrow(), id, body); }

  @Post(':id/close')
  @Roles('super_admin', 'admin')
  async close(@Param('id') id: string, @Body() body: { outcome: string }) { return this.service.closePIP(this.getOrgIdOrThrow(), id, body.outcome); }
}
