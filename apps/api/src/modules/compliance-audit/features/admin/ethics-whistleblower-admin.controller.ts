import { Body, Controller, Get, Param, Patch, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { EthicsWhistleblowerAdminService } from './ethics-whistleblower-admin.service';

@Roles('super_admin', 'admin')
@Controller('compliance-audit/admin/ethics')
export class EthicsWhistleblowerAdminController {
  constructor(
    private readonly service: EthicsWhistleblowerAdminService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listComplaints() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listComplaints(orgId);
  }

  @Get('analytics')
  async getEthicsAnalytics() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getEthicsAnalytics(orgId);
  }

  @Get(':id')
  async getComplaint(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getComplaint(orgId, id);
  }

  @Patch(':id/assign')
  async assignInvestigator(
    @Param('id') id: string,
    @Body() dto: { investigatorId: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.assignInvestigator(orgId, id, dto);
  }

  @Patch(':id/update-status')
  async updateComplaintStatus(
    @Param('id') id: string,
    @Body() dto: { status: string; investigationNotes?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateComplaintStatus(orgId, id, dto);
  }

  @Patch(':id/close')
  async closeComplaint(
    @Param('id') id: string,
    @Body() dto: { outcome: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.closeComplaint(orgId, id, dto);
  }
}
