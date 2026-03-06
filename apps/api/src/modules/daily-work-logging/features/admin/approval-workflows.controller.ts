import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ApprovalWorkflowsService } from './approval-workflows.service';

@Controller('daily-work-logging/admin/workflows')
export class ApprovalWorkflowsController {
  constructor(
    private readonly approvalWorkflowsService: ApprovalWorkflowsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async getWorkflowConfig() {
    const orgId = this.getOrgIdOrThrow();
    return this.approvalWorkflowsService.getWorkflowConfig(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async updateWorkflowConfig(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.approvalWorkflowsService.updateWorkflowConfig(orgId, body);
  }

  @Get('pending')
  @Roles('super_admin', 'admin')
  async listPendingSubmissions() {
    const orgId = this.getOrgIdOrThrow();
    return this.approvalWorkflowsService.listPendingSubmissions(orgId);
  }
}
