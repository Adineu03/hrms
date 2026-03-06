import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ReimbursementsClaimsService } from './reimbursements-claims.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('payroll-processing/employee/reimbursements')
export class ReimbursementsClaimsController {
  constructor(
    private readonly service: ReimbursementsClaimsService,
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
  async listClaims() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listClaims(orgId, userId);
  }

  @Post()
  async submitClaim(
    @Body()
    dto: {
      type: string;
      amount: string;
      description: string;
      receiptUrl?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitClaim(orgId, userId, dto);
  }

  @Get('history')
  async getClaimHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getClaimHistory(orgId, userId);
  }

  @Get(':id')
  async getClaimDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getClaimDetail(orgId, userId, id);
  }
}
