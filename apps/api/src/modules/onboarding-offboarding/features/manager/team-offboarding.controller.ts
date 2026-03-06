import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamOffboardingService } from './team-offboarding.service';

@Controller('onboarding-offboarding/manager/team-offboarding')
export class TeamOffboardingController {
  constructor(
    private readonly service: TeamOffboardingService,
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
  async listOffboardings() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listOffboardings(orgId, managerId);
  }

  @Get('handover-status')
  @Roles('super_admin', 'admin', 'manager')
  async getHandoverStatus() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getHandoverStatus(orgId, managerId);
  }

  @Get('pending-approvals')
  @Roles('super_admin', 'admin', 'manager')
  async getPendingApprovals() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getPendingApprovals(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getOffboardingDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getOffboardingDetail(orgId, managerId, id);
  }

  @Post(':id/knowledge-transfer')
  @Roles('super_admin', 'admin', 'manager')
  async assignKnowledgeTransfer(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.assignKnowledgeTransfer(orgId, managerId, id, body);
  }

  @Patch(':id/clearance')
  @Roles('super_admin', 'admin', 'manager')
  async approveClearance(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.approveClearance(orgId, managerId, id, body);
  }
}
