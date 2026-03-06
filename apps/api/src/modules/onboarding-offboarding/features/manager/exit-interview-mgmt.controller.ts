import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExitInterviewMgmtService } from './exit-interview-mgmt.service';

@Controller('onboarding-offboarding/manager/exit-interviews')
export class ExitInterviewMgmtController {
  constructor(
    private readonly service: ExitInterviewMgmtService,
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
  async listExitInterviews() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listExitInterviews(orgId, managerId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async scheduleInterview(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.scheduleInterview(orgId, managerId, body);
  }

  @Get('feedback-themes')
  @Roles('super_admin', 'admin', 'manager')
  async getFeedbackThemes() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getFeedbackThemes(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getInterviewDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getInterviewDetail(orgId, managerId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async updateInterview(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.updateInterview(orgId, managerId, id, body);
  }

  @Post(':id/complete')
  @Roles('super_admin', 'admin', 'manager')
  async completeInterview(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.completeInterview(orgId, managerId, id, body);
  }
}
