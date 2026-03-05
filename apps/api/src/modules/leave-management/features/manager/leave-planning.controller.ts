import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeavePlanningService } from './leave-planning.service';

@Controller('leave-management/manager/planning')
export class LeavePlanningController {
  constructor(
    private readonly leavePlanningService: LeavePlanningService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getManagerId(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get('availability-calendar')
  @Roles('super_admin', 'admin', 'manager')
  async getAvailabilityCalendar(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.leavePlanningService.getAvailabilityCalendar(orgId, managerId, m, y);
  }

  @Post('block-dates')
  @Roles('super_admin', 'admin', 'manager')
  async blockDates(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leavePlanningService.blockDates(orgId, managerId, body);
  }

  @Get('blocked-dates')
  @Roles('super_admin', 'admin', 'manager')
  async getBlockedDates() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leavePlanningService.getBlockedDates(orgId, managerId);
  }

  @Delete('blocked-dates/:id')
  @Roles('super_admin', 'admin', 'manager')
  async removeBlockedDate(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leavePlanningService.removeBlockedDate(orgId, managerId, id);
  }

  @Get('recommendations')
  @Roles('super_admin', 'admin', 'manager')
  async getRecommendations(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.leavePlanningService.getRecommendations(orgId, managerId, m, y);
  }
}
