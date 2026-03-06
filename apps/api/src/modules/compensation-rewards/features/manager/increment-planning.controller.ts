import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { IncrementPlanningService } from './increment-planning.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('compensation-rewards/manager/increment-planning')
export class IncrementPlanningController {
  constructor(
    private readonly service: IncrementPlanningService,
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

  @Get('revisions')
  async listActiveRevisions() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listActiveRevisions(orgId);
  }

  @Get('revisions/:id/team')
  async getTeamMembersInRevision(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamMembersInRevision(orgId, userId, id);
  }

  @Post('revisions/:id/propose')
  async proposeIncrement(@Param('id') id: string, @Body() dto: {
    employeeId: string;
    proposedCtc: string;
    incrementPercent: string;
    incrementAmount: string;
    meritScore?: number;
    remarks?: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.proposeIncrement(orgId, userId, id, dto);
  }

  @Get('team-comparison')
  async getTeamComparison() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamComparison(orgId, userId);
  }
}
