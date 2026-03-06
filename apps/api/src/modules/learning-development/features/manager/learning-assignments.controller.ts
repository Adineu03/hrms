import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LearningAssignmentsService } from './learning-assignments.service';

@Controller('learning-development/manager/assignments')
export class LearningAssignmentsController {
  constructor(
    private readonly service: LearningAssignmentsService,
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
  async list(@Query('status') status?: string, @Query('courseId') courseId?: string) {
    return this.service.listAssignments(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), { status, courseId });
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async assign(@Body() body: { courseId: string; employeeIds: string[]; deadline?: string; notes?: string }) {
    return this.service.assignCourse(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body);
  }

  @Get('overdue')
  @Roles('super_admin', 'admin', 'manager')
  async getOverdue() {
    return this.service.getOverdueAssignments(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Post(':id/reminder')
  @Roles('super_admin', 'admin', 'manager')
  async sendReminder(@Param('id') id: string) {
    return this.service.sendReminder(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id);
  }
}
