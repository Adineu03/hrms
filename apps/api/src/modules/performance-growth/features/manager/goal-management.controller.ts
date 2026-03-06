import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { GoalManagementService } from './goal-management.service';

@Controller('performance-growth/manager/goals')
export class GoalManagementController {
  constructor(
    private readonly service: GoalManagementService,
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
  async listTeamGoals(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listTeamGoals(orgId, managerId, { status, category, employeeId });
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async createGoalForEmployee(@Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.createGoalForEmployee(orgId, managerId, body);
  }

  @Get('cascade')
  @Roles('super_admin', 'admin', 'manager')
  async getCascadedGoals() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getCascadedGoals(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getGoal(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getGoal(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async updateGoal(@Param('id') id: string, @Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.updateGoal(orgId, managerId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'manager')
  async softDeleteGoal(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.softDeleteGoal(orgId, id);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'admin', 'manager')
  async approveGoalModification(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.approveGoalModification(orgId, managerId, id);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'admin', 'manager')
  async rejectGoalModification(@Param('id') id: string, @Body() body: { reason?: string }) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.rejectGoalModification(orgId, managerId, id, body);
  }
}
