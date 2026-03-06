import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CandidateReviewService } from './candidate-review.service';

@Controller('talent-acquisition/manager/candidates')
export class CandidateReviewController {
  constructor(
    private readonly service: CandidateReviewService,
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
  async listShortlistedCandidates() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listShortlistedCandidates(orgId, managerId);
  }

  @Get('compare')
  @Roles('super_admin', 'admin', 'manager')
  async compareCandidates(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.compareCandidates(orgId, managerId, body);
  }

  @Get(':applicationId')
  @Roles('super_admin', 'admin', 'manager')
  async getCandidateDetail(@Param('applicationId') applicationId: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getCandidateDetail(orgId, managerId, applicationId);
  }

  @Post(':applicationId/note')
  @Roles('super_admin', 'admin', 'manager')
  async addNote(
    @Param('applicationId') applicationId: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.addNote(orgId, managerId, applicationId, body);
  }

  @Post(':applicationId/move-stage')
  @Roles('super_admin', 'admin', 'manager')
  async moveStage(
    @Param('applicationId') applicationId: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.moveStage(orgId, managerId, applicationId, body);
  }
}
