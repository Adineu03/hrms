import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TransferMobilityRequestsService } from './transfer-mobility-requests.service';

@Roles('manager', 'super_admin', 'admin')
@Controller('workforce-planning/manager/transfer-requests')
export class TransferMobilityRequestsController {
  constructor(
    private readonly service: TransferMobilityRequestsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async listTeamTransferRequests() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listTeamTransferRequests(orgId);
  }

  @Post()
  async submitTransferRequest(
    @Body()
    dto: {
      employeeId: string;
      requestType: string;
      toDepartmentId?: string;
      toLocationId?: string;
      toDesignationId?: string;
      effectiveDate?: string;
      reason?: string;
      backfillRequired?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitTransferRequest(orgId, userId, dto);
  }

  @Get(':id')
  async getTransferRequest(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTransferRequest(orgId, id);
  }

  @Post(':id/backfill')
  async markBackfillInProgress(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.markBackfillInProgress(orgId, id);
  }
}
