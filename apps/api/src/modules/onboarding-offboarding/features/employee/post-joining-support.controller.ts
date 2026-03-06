import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PostJoiningSupportService } from './post-joining-support.service';

@Controller('onboarding-offboarding/employee/post-joining')
export class PostJoiningSupportController {
  constructor(
    private readonly service: PostJoiningSupportService,
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

  @Get('checkins')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCheckins() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCheckins(orgId, userId);
  }

  @Post('checkins/:id/feedback')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitCheckinFeedback(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitCheckinFeedback(orgId, userId, id, body);
  }

  @Post('training-request')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async requestTraining(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.requestTraining(orgId, userId, body);
  }

  @Post('hr-question')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitHrQuestion(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitHrQuestion(orgId, userId, body);
  }

  @Get('benefits')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getBenefitsStatus() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getBenefitsStatus(orgId, userId);
  }

  @Post('it-support')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitItSupportRequest(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitItSupportRequest(orgId, userId, body);
  }

  @Get('workspace')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getWorkspaceInfo() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getWorkspaceInfo(orgId, userId);
  }

  @Get('calendar')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCompanyCalendar() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCompanyCalendar(orgId, userId);
  }
}
