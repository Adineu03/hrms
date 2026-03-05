import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ApplyLeaveService } from './apply-leave.service';

@Controller('leave-management/employee/apply')
export class ApplyLeaveController {
  constructor(
    private readonly applyLeaveService: ApplyLeaveService,
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

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async applyLeave(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.applyLeaveService.applyLeave(orgId, userId, body);
  }

  @Post('draft')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async saveDraft(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.applyLeaveService.saveDraft(orgId, userId, body);
  }

  @Patch(':id/submit')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitDraft(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.applyLeaveService.submitDraft(orgId, userId, id);
  }

  @Patch(':id/cancel')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async cancelRequest(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.applyLeaveService.cancelRequest(orgId, userId, id, body);
  }

  @Get('team-conflicts')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getTeamConflicts(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.applyLeaveService.getTeamConflicts(orgId, userId, fromDate, toDate);
  }

  @Get('check-balance')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async checkBalance(
    @Query('leaveTypeId') leaveTypeId: string,
    @Query('year') year?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.applyLeaveService.checkBalance(orgId, userId, leaveTypeId, year);
  }
}
