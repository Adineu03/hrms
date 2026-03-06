import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TalentAssessmentService } from './talent-assessment.service';

@Controller('performance-growth/manager/talent')
export class TalentAssessmentController {
  constructor(private readonly service: TalentAssessmentService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get('nine-box') @Roles('super_admin', 'admin', 'manager')
  async getNineBox() { return this.service.getNineBoxGrid(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Post('nine-box') @Roles('super_admin', 'admin', 'manager')
  async updateNineBox(@Body() body: Record<string, any>) { return this.service.updateNineBoxAssessment(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body as any); }

  @Get('succession') @Roles('super_admin', 'admin', 'manager')
  async getSuccessionPlan() { return this.service.getSuccessionPlan(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Post('succession') @Roles('super_admin', 'admin', 'manager')
  async updateSuccessionPlan(@Body() body: Record<string, any>) { return this.service.updateSuccessionPlan(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body as any); }

  @Get('high-potential') @Roles('super_admin', 'admin', 'manager')
  async getHighPotentials() { return this.service.getHighPotentials(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('readiness') @Roles('super_admin', 'admin', 'manager')
  async getReadiness() { return this.service.getReadinessAssessments(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }
}
