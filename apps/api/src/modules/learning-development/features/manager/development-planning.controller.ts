import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DevelopmentPlanningService } from './development-planning.service';

@Controller('learning-development/manager/development-plans')
export class DevelopmentPlanningController {
  constructor(
    private readonly service: DevelopmentPlanningService,
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
  @Roles('super_admin', 'admin', 'manager')
  async list() {
    return this.service.listDevelopmentPlans(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async create(@Body() body: any) {
    return this.service.createDevelopmentPlan(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getById(@Param('id') id: string) {
    return this.service.getDevelopmentPlan(this.getOrgIdOrThrow(), id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.service.updateDevelopmentPlan(this.getOrgIdOrThrow(), id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'manager')
  async remove(@Param('id') id: string) {
    return this.service.deleteDevelopmentPlan(this.getOrgIdOrThrow(), id);
  }
}
