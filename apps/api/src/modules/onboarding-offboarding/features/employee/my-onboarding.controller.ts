import {
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyOnboardingService } from './my-onboarding.service';

@Controller('onboarding-offboarding/employee/my-onboarding')
export class MyOnboardingController {
  constructor(
    private readonly service: MyOnboardingService,
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
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOverview() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOverview(orgId, userId);
  }

  @Get('checklist')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getChecklist() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getChecklist(orgId, userId);
  }

  @Post('tasks/:taskId/complete')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async completeTask(@Param('taskId') taskId: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.completeTask(orgId, userId, taskId);
  }

  @Get('orientation')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOrientation() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOrientation(orgId, userId);
  }

  @Get('team')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTeam() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeam(orgId, userId);
  }

  @Get('first-day')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getFirstDayInfo() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getFirstDayInfo(orgId, userId);
  }

  @Get('progress')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getProgress() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getProgress(orgId, userId);
  }

  @Get('policies')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPolicies() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPolicies(orgId, userId);
  }
}
