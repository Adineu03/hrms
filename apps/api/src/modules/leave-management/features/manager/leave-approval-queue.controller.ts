import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LeaveApprovalQueueService } from './leave-approval-queue.service';

@Controller('leave-management/manager/approval-queue')
export class LeaveApprovalQueueController {
  constructor(
    private readonly leaveApprovalQueueService: LeaveApprovalQueueService,
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

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  async getPendingQueue() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leaveApprovalQueueService.getPendingQueue(orgId, managerId);
  }

  @Patch(':id/approve')
  @Roles('super_admin', 'admin', 'manager')
  async approveRequest(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leaveApprovalQueueService.approveRequest(orgId, managerId, id, body);
  }

  @Patch(':id/reject')
  @Roles('super_admin', 'admin', 'manager')
  async rejectRequest(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leaveApprovalQueueService.rejectRequest(orgId, managerId, id, body);
  }

  @Post('bulk-approve')
  @Roles('super_admin', 'admin', 'manager')
  async bulkApprove(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leaveApprovalQueueService.bulkApprove(orgId, managerId, body);
  }

  @Get(':id/history')
  @Roles('super_admin', 'admin', 'manager')
  async getEmployeeLeaveHistory(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getManagerId();
    return this.leaveApprovalQueueService.getEmployeeLeaveHistory(orgId, managerId, id);
  }
}
