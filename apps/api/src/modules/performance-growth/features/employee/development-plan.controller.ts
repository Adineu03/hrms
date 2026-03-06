import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DevelopmentPlanService } from './development-plan.service';

@Controller('performance-growth/employee/development')
export class DevelopmentPlanController {
  constructor(private readonly service: DevelopmentPlanService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get() @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCurrent() { return this.service.getMyDevelopmentPlan(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('all') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getAll() { return this.service.getAllPlans(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('skills') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSkills() { return this.service.getSkillsAssessment(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Post('skills') @Roles('super_admin', 'admin', 'manager', 'employee')
  async updateSkills(@Body() body: Record<string, any>) { return this.service.updateSkillsAssessment(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body); }

  @Patch(':id') @Roles('super_admin', 'admin', 'manager', 'employee')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.updatePlanProgress(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }

  @Post(':id/activity') @Roles('super_admin', 'admin', 'manager', 'employee')
  async addActivity(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.logActivity(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }

  @Post(':id/certification') @Roles('super_admin', 'admin', 'manager', 'employee')
  async addCert(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.addCertification(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }

  @Post('training-request') @Roles('super_admin', 'admin', 'manager', 'employee')
  async requestTraining(@Body() body: Record<string, any>) { return this.service.requestTraining(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body); }
}
