import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { GoalFrameworkSetupService } from './goal-framework-setup.service';

@Controller('performance-growth/admin/goal-framework')
export class GoalFrameworkSetupController {
  constructor(private readonly service: GoalFrameworkSetupService, private readonly tenantService: TenantService) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('templates')
  @Roles('super_admin', 'admin')
  async listTemplates(@Query('category') category?: string) {
    return this.service.listGoalTemplates(this.getOrgIdOrThrow(), category);
  }

  @Post('templates')
  @Roles('super_admin', 'admin')
  async createTemplate(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = this.tenantService.getUserId?.() ?? orgId;
    return this.service.createGoalTemplate(orgId, createdBy, body);
  }

  @Get('templates/:id')
  @Roles('super_admin', 'admin')
  async getTemplate(@Param('id') id: string) { return this.service.getGoalTemplate(this.getOrgIdOrThrow(), id); }

  @Patch('templates/:id')
  @Roles('super_admin', 'admin')
  async updateTemplate(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.updateGoalTemplate(this.getOrgIdOrThrow(), id, body); }

  @Delete('templates/:id')
  @Roles('super_admin', 'admin')
  async deleteTemplate(@Param('id') id: string) { return this.service.deleteGoalTemplate(this.getOrgIdOrThrow(), id); }

  @Get('org-goals')
  @Roles('super_admin', 'admin')
  async listOrgGoals() { return this.service.listOrgGoals(this.getOrgIdOrThrow()); }

  @Post('org-goals')
  @Roles('super_admin', 'admin')
  async createOrgGoal(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = this.tenantService.getUserId?.() ?? orgId;
    return this.service.createOrgGoal(orgId, createdBy, body);
  }

  @Get('stats')
  @Roles('super_admin', 'admin')
  async getStats() { return this.service.getGoalStats(this.getOrgIdOrThrow()); }
}
