import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CompetencyLibraryService } from './competency-library.service';

@Controller('performance-growth/admin/competencies')
export class CompetencyLibraryController {
  constructor(private readonly service: CompetencyLibraryService, private readonly tenantService: TenantService) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(@Query('status') status?: string, @Query('category') category?: string) {
    return this.service.listCompetencies(this.getOrgIdOrThrow(), { status, category });
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createCompetency(orgId, this.tenantService.getUserId?.() ?? orgId, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) { return this.service.getCompetency(this.getOrgIdOrThrow(), id); }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.updateCompetency(this.getOrgIdOrThrow(), id, body); }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) { return this.service.deleteCompetency(this.getOrgIdOrThrow(), id); }

  @Post('import')
  @Roles('super_admin', 'admin')
  async importCompetencies(@Body() body: { competencies: Record<string, any>[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.importCompetencies(orgId, this.tenantService.getUserId?.() ?? orgId, body.competencies);
  }

  @Get('export/all')
  @Roles('super_admin', 'admin')
  async exportCompetencies() { return this.service.exportCompetencies(this.getOrgIdOrThrow()); }
}
