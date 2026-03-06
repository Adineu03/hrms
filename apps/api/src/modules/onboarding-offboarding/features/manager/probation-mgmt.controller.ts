import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ProbationMgmtService } from './probation-mgmt.service';

@Controller('onboarding-offboarding/manager/probation')
export class ProbationMgmtController {
  constructor(
    private readonly service: ProbationMgmtService,
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
  async listProbationEmployees() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listProbationEmployees(orgId, managerId);
  }

  @Get('expiring')
  @Roles('super_admin', 'admin', 'manager')
  async getExpiringProbations() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getExpiringProbations(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getProbationDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getProbationDetail(orgId, managerId, id);
  }

  @Post(':id/review')
  @Roles('super_admin', 'admin', 'manager')
  async submitReview(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.submitReview(orgId, managerId, id, body);
  }

  @Post(':id/confirm')
  @Roles('super_admin', 'admin', 'manager')
  async confirmProbation(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.confirmProbation(orgId, managerId, id, body);
  }

  @Post(':id/extend')
  @Roles('super_admin', 'admin', 'manager')
  async extendProbation(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.extendProbation(orgId, managerId, id, body);
  }
}
