import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { InterviewMgmtService } from './interview-mgmt.service';

@Controller('talent-acquisition/manager/interviews')
export class InterviewMgmtController {
  constructor(
    private readonly service: InterviewMgmtService,
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
  async listUpcomingInterviews() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listUpcomingInterviews(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getInterviewDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getInterviewDetail(orgId, managerId, id);
  }

  @Post(':id/feedback')
  @Roles('super_admin', 'admin', 'manager')
  async submitFeedback(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.submitFeedback(orgId, managerId, id, body);
  }

  @Get(':id/panel-feedback')
  @Roles('super_admin', 'admin', 'manager')
  async getPanelFeedback(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getPanelFeedback(orgId, managerId, id);
  }

  @Post(':id/decision')
  @Roles('super_admin', 'admin', 'manager')
  async setDecision(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.setDecision(orgId, managerId, id, body);
  }
}
