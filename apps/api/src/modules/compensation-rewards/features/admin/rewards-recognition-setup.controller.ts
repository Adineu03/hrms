import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { RewardsRecognitionSetupService } from './rewards-recognition-setup.service';

@Roles('super_admin', 'admin')
@Controller('compensation-rewards/admin/rewards-recognition')
export class RewardsRecognitionSetupController {
  constructor(
    private readonly service: RewardsRecognitionSetupService,
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
    return this.service.listPrograms(orgId);
  }

  @Post('programs')
  async createProgram(@Body() dto: {
    name: string;
    type?: string;
    description?: string;
    frequency?: string;
    pointsValue?: number;
    budget?: string;
    nominationWorkflow?: any;
    eligibilityRules?: any;
    rewardCatalog?: any[];
  }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createProgram(orgId, userId, dto);
  }

  @Patch('programs/:id')
  async updateProgram(@Param('id') id: string, @Body() dto: {
    name?: string;
    type?: string;
    description?: string;
    frequency?: string;
    pointsValue?: number;
    budget?: string;
    nominationWorkflow?: any;
    eligibilityRules?: any;
    rewardCatalog?: any[];
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateProgram(orgId, id, dto);
  }

  @Delete('programs/:id')
  async deleteProgram(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteProgram(orgId, id);
  }

  @Get('nominations')
  async listNominations(@Query('status') status?: string, @Query('programId') programId?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listNominations(orgId, { status, programId });
  }

  @Patch('nominations/:id')
  async approveRejectNomination(@Param('id') id: string, @Body() dto: { status: 'approved' | 'rejected'; pointsAwarded?: number }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.approveRejectNomination(orgId, id, userId, dto);
  }

  @Get('analytics')
  async getAnalytics() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getAnalytics(orgId);
  }
}
