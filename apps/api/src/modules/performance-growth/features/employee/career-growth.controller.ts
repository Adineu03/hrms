import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CareerGrowthService } from './career-growth.service';

@Controller('performance-growth/employee/career')
export class CareerGrowthController {
  constructor(private readonly service: CareerGrowthService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get('paths') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPaths() { return this.service.getCareerPaths(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('path/:pathId') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPathDetail(@Param('pathId') pathId: string) { return this.service.getCareerPathDetail(this.getOrgIdOrThrow(), pathId); }

  @Get('gap-analysis') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getGapAnalysis() { return this.service.getGapAnalysis(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('opportunities') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOpportunities() { return this.service.getInternalOpportunities(this.getOrgIdOrThrow()); }

  @Get('readiness') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getReadiness() { return this.service.getPromotionReadiness(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('milestones') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getMilestones() { return this.service.getGrowthMilestones(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Post('discussion-request') @Roles('super_admin', 'admin', 'manager', 'employee')
  async requestDiscussion(@Body() body: Record<string, any>) { return this.service.requestCareerDiscussion(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body); }
}
