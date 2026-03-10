import { Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PolicyAcknowledgmentService } from './policy-acknowledgment.service';

@Controller('compliance-audit/employee/policy-acknowledgment')
export class PolicyAcknowledgmentController {
  constructor(
    private readonly service: PolicyAcknowledgmentService,
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

  @Get('pending')
  async getPendingAcknowledgments() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getPendingAcknowledgments(orgId, userId);
  }

  @Get()
  async getMyPolicies() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyPolicies(orgId, userId);
  }

  @Get(':id')
  async getPolicyDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPolicyDetail(orgId, id);
  }

  @Post(':id/acknowledge')
  async acknowledgePolicyPolicy(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.acknowledgePolicyPolicy(orgId, userId, id);
  }
}
