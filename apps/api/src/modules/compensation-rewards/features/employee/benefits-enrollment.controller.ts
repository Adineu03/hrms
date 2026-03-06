import { Body, Controller, Delete, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { BenefitsEnrollmentService } from './benefits-enrollment.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('compensation-rewards/employee/benefits')
export class BenefitsEnrollmentController {
  constructor(
    private readonly service: BenefitsEnrollmentService,
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

  @Get('plans')
  async listAvailablePlans() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listAvailablePlans(orgId);
  }

  @Get('enrollments')
  async listMyEnrollments() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listMyEnrollments(orgId, userId);
  }

  @Post('enrollments')
  async enrollInPlan(@Body() dto: {
    planId: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    dependents?: any[];
  }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.enrollInPlan(orgId, userId, dto);
  }

  @Delete('enrollments/:id')
  async optOut(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.optOut(orgId, userId, id);
  }

  @Get('reimbursements')
  async listMyReimbursements() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listMyReimbursements(orgId, userId);
  }

  @Post('reimbursements')
  async submitReimbursementClaim(@Body() dto: {
    type: string;
    amount: string;
    description: string;
    receiptUrl?: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitReimbursementClaim(orgId, userId, dto);
  }
}
