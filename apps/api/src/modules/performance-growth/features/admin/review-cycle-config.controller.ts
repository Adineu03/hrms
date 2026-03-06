import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ReviewCycleConfigService } from './review-cycle-config.service';

@Controller('performance-growth/admin/review-cycles')
export class ReviewCycleConfigController {
  constructor(
    private readonly service: ReviewCycleConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listCycles(orgId, { status, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20 });
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = this.tenantService.getUserId?.() ?? orgId;
    return this.service.createCycle(orgId, createdBy, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCycle(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateCycle(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteCycle(orgId, id);
  }

  @Get(':id/assignments')
  @Roles('super_admin', 'admin')
  async getAssignments(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCycleAssignments(orgId, id);
  }

  @Post(':id/launch')
  @Roles('super_admin', 'admin')
  async launch(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.launchCycle(orgId, id);
  }
}
