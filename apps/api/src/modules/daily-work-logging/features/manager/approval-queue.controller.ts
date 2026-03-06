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
import { ApprovalQueueService } from './approval-queue.service';

@Controller('daily-work-logging/manager/approvals')
export class ApprovalQueueController {
  constructor(
    private readonly service: ApprovalQueueService,
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
  async getPendingSubmissions() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getPendingSubmissions(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getSubmissionDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getSubmissionDetail(orgId, managerId, id);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'admin', 'manager')
  async approveSubmission(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.approveSubmission(orgId, managerId, id, body);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'admin', 'manager')
  async rejectSubmission(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.rejectSubmission(orgId, managerId, id, body);
  }

  @Post('bulk-approve')
  @Roles('super_admin', 'admin', 'manager')
  async bulkApprove(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.bulkApprove(orgId, managerId, body);
  }
}
