import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SalaryStructureConfigService } from './salary-structure-config.service';

@Roles('super_admin', 'admin')
@Controller('compensation-rewards/admin/salary-structure')
export class SalaryStructureConfigController {
  constructor(
    private readonly service: SalaryStructureConfigService,
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
    return this.service.listSalaryStructures(orgId);
  }

  @Post()
  async create(@Body() dto: { name: string; description?: string; components?: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createSalaryStructure(orgId, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: { name?: string; description?: string; components?: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateSalaryStructure(orgId, id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteSalaryStructure(orgId, id);
  }

  @Get('pay-bands')
  async getPayBands() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPayBands(orgId);
  }

  @Post('pay-bands')
  async savePayBands(@Body() dto: { payBands: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.savePayBands(orgId, dto.payBands);
  }

  @Get('statutory')
  async getStatutoryConfig() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getStatutoryConfig(orgId);
  }

  @Post('statutory')
  async saveStatutoryConfig(@Body() dto: { pf?: any; esi?: any; pt?: any; lwf?: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.saveStatutoryConfig(orgId, dto);
  }
}
