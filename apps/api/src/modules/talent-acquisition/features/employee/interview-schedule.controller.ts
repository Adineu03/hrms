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
import { InterviewScheduleService } from './interview-schedule.service';

@Controller('talent-acquisition/employee/interviews')
export class InterviewScheduleController {
  constructor(
    private readonly service: InterviewScheduleService,
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
  async listUpcomingInterviews() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listUpcomingInterviews(orgId, userId);
  }

  @Get('past')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async listPastInterviews() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listPastInterviews(orgId, userId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getInterviewDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getInterviewDetail(orgId, userId, id);
  }

  @Post(':id/accept')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async acceptInterview(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.acceptInterview(orgId, userId, id);
  }

  @Post(':id/decline')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async declineInterview(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.declineInterview(orgId, userId, id, body);
  }

  @Post(':id/reschedule')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async requestReschedule(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.requestReschedule(orgId, userId, id, body);
  }
}
