import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CultureValuesSetupService } from './culture-values-setup.service';

@Roles('super_admin', 'admin')
@Controller('engagement-culture/admin/culture-values')
export class CultureValuesSetupController {
  constructor(
    private readonly service: CultureValuesSetupService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async list() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listCultureValues(orgId);
  }

  @Post()
  async create(@Body() dto: { name: string; description?: string; icon?: string }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createCultureValue(orgId, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: { name?: string; description?: string; icon?: string }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateCultureValue(orgId, id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteCultureValue(orgId, id);
  }

  @Patch('reorder')
  async reorder(@Body() dto: { orderedIds: string[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.reorderValues(orgId, dto.orderedIds);
  }

  @Get('dashboard')
  async getDashboard() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCultureDashboard(orgId);
  }
}
