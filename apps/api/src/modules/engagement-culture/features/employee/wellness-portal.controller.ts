import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { WellnessPortalService } from './wellness-portal.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('engagement-culture/employee/wellness')
export class WellnessPortalController {
  constructor(
    private readonly service: WellnessPortalService,
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

  @Get('programs')
  async listPrograms() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listAvailablePrograms(orgId);
  }

  @Post('programs/:id/enroll')
  async enroll(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.enrollInProgram(orgId, userId, id);
  }

  @Patch('programs/:id/progress')
  async updateProgress(@Param('id') id: string, @Body() dto: { progress: number }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateProgress(orgId, userId, id, dto.progress);
  }

  @Get('my-participations')
  async getMyParticipations() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyParticipations(orgId, userId);
  }

  @Get('challenges')
  async getChallenges() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getActiveChallenges(orgId);
  }

  @Get('points')
  async getPoints() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getWellnessPoints(orgId, userId);
  }
}
