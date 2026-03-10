import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PolicyViolationTrackingService } from './policy-violation-tracking.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('compliance-audit/manager/policy-violations')
export class PolicyViolationTrackingController {
  constructor(
    private readonly service: PolicyViolationTrackingService,
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
  async listViolations() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listViolations(orgId, userId);
  }

  @Post()
  async createViolation(
    @Body()
    dto: {
      employeeId: string;
      policyId: string;
      violationType: string;
      description: string;
      severity: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createViolation(orgId, userId, dto);
  }

  @Patch(':id/disciplinary-action')
  async recordDisciplinaryAction(
    @Param('id') id: string,
    @Body() dto: { action: string; notes?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.recordDisciplinaryAction(orgId, userId, id, dto);
  }

  @Get('history/:employeeId')
  async getViolationHistory(@Param('employeeId') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getViolationHistory(orgId, userId, employeeId);
  }
}
