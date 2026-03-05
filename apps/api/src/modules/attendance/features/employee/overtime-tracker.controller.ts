import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OvertimeTrackerService } from './overtime-tracker.service';

@Controller('attendance/employee/overtime')
export class OvertimeTrackerController {
  constructor(
    private readonly overtimeTrackerService: OvertimeTrackerService,
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

  @Get('summary')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSummary(@Query('period') period: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.overtimeTrackerService.getSummary(orgId, userId, period || 'monthly');
  }

  @Post('request')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitRequest(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.overtimeTrackerService.submitRequest(orgId, userId, body);
  }

  @Get('requests')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async listRequests(
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.overtimeTrackerService.listRequests(
      orgId,
      userId,
      status || undefined,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('requests/:id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getRequest(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.overtimeTrackerService.getRequest(orgId, userId, id);
  }

  @Get('policy')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPolicy() {
    const orgId = this.getOrgIdOrThrow();
    return this.overtimeTrackerService.getPolicy(orgId);
  }

  @Get('trends')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTrends(@Query('months') months: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.overtimeTrackerService.getTrends(orgId, userId, months ? parseInt(months, 10) : 6);
  }
}
