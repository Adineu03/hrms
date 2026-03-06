import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TrainingCalendarService } from './training-calendar.service';

@Controller('learning-development/admin/training-sessions')
export class TrainingCalendarController {
  constructor(
    private readonly service: TrainingCalendarService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.listSessions(this.getOrgIdOrThrow(), { status, type, startDate, endDate });
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createSession(orgId, this.tenantService.getUserId?.() ?? orgId, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    return this.service.getSession(this.getOrgIdOrThrow(), id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.updateSession(this.getOrgIdOrThrow(), id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    return this.service.deleteSession(this.getOrgIdOrThrow(), id);
  }

  @Post(':id/attendance')
  @Roles('super_admin', 'admin')
  async recordAttendance(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.recordAttendance(this.getOrgIdOrThrow(), id, body);
  }
}
