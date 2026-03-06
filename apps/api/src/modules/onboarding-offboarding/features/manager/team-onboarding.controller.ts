import { Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamOnboardingService } from './team-onboarding.service';

@Controller('onboarding-offboarding/manager/team-onboarding')
export class TeamOnboardingController {
  constructor(
    private readonly service: TeamOnboardingService,
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
  async listOnboardings(@Query('status') status?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listOnboardings(orgId, managerId, status);
  }

  @Get('pending-tasks')
  @Roles('super_admin', 'admin', 'manager')
  async getPendingTasks() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getPendingTasks(orgId, managerId);
  }

  @Get('checklist-progress')
  @Roles('super_admin', 'admin', 'manager')
  async getChecklistProgress() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getChecklistProgress(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getOnboardingDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getOnboardingDetail(orgId, managerId, id);
  }

  @Post(':id/tasks/:taskId/complete')
  @Roles('super_admin', 'admin', 'manager')
  async completeTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.completeTask(orgId, managerId, id, taskId);
  }

  @Post(':id/send-reminder')
  @Roles('super_admin', 'admin', 'manager')
  async sendReminder(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.sendReminder(orgId, managerId, id);
  }
}
