import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { RecognitionManagementService } from './recognition-management.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('compensation-rewards/manager/recognition')
export class RecognitionManagementController {
  constructor(
    private readonly service: RecognitionManagementService,
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

  @Get('nominations')
  async listNominations() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listTeamNominations(orgId, userId);
  }

  @Post('nominations')
  async nominate(@Body() dto: { programId: string; nomineeId: string; category?: string; reason: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.nominateTeamMember(orgId, userId, dto);
  }

  @Patch('nominations/:id')
  async approveReject(@Param('id') id: string, @Body() dto: { status: 'approved' | 'rejected'; pointsAwarded?: number }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.approveRejectNomination(orgId, userId, id, dto);
  }

  @Get('dashboard')
  async getDashboard() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamRecognitionDashboard(orgId, userId);
  }
}
