import { Body, Controller, Get, Param, Patch, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { InternalMobilityTransfersService } from './internal-mobility-transfers.service';

@Roles('super_admin', 'admin')
@Controller('workforce-planning/admin/internal-mobility')
export class InternalMobilityTransfersController {
  constructor(
    private readonly service: InternalMobilityTransfersService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('stats')
  async getMobilityStats() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getMobilityStats(orgId);
  }

  @Get()
  async listTransfers() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listTransfers(orgId);
  }

  @Get(':id')
  async getTransfer(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTransfer(orgId, id);
  }

  @Patch(':id/approve')
  async approveTransfer(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.approveTransfer(orgId, id);
  }

  @Patch(':id/reject')
  async rejectTransfer(@Param('id') id: string, @Body() dto: { rejectionReason?: string }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.rejectTransfer(orgId, id, dto);
  }

  @Patch(':id/complete')
  async completeTransfer(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.completeTransfer(orgId, id);
  }
}
