import { Controller, Get, Post, Patch, Param, Body, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamDevelopmentService } from './team-development.service';

@Controller('performance-growth/manager/development')
export class TeamDevelopmentController {
  constructor(
    private readonly service: TeamDevelopmentService,
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
  async listTeamDevelopmentPlans() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listTeamDevelopmentPlans(orgId, managerId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async createDevelopmentPlan(@Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.createDevelopmentPlan(orgId, managerId, body);
  }

  @Get('skill-gaps')
  @Roles('super_admin', 'admin', 'manager')
  async getTeamSkillGaps() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTeamSkillGaps(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getDevelopmentPlan(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getDevelopmentPlan(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async updateDevelopmentPlan(@Param('id') id: string, @Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateDevelopmentPlan(orgId, id, body);
  }

  @Post(':id/activities')
  @Roles('super_admin', 'admin', 'manager')
  async addActivity(@Param('id') id: string, @Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.addActivity(orgId, id, body);
  }

  @Post(':id/recommend')
  @Roles('super_admin', 'admin', 'manager')
  async recommendTraining(@Param('id') id: string, @Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.recommendTraining(orgId, id, body);
  }
}
