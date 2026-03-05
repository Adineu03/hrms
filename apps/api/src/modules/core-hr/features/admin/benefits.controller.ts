import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { AdminBenefitsService } from './benefits.service';

@Controller('core-hr/admin/benefits')
export class AdminBenefitsController {
  constructor(
    private readonly benefitsService: AdminBenefitsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('plans')
  @Roles('super_admin', 'admin')
  async listPlans() {
    const orgId = this.getOrgIdOrThrow();
    return this.benefitsService.listPlans(orgId);
  }

  @Get('plans/:id')
  @Roles('super_admin', 'admin')
  async getPlanById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.benefitsService.getPlanById(orgId, id);
  }

  @Post('plans')
  @Roles('super_admin', 'admin')
  async createPlan(@Body() body: {
    name: string;
    type: string;
    description?: string;
    provider?: string;
    eligibilityRules?: Record<string, any>;
    employerContribution?: string;
    employerContributionType?: string;
    employeeContribution?: string;
    employeeContributionType?: string;
    coverageDetails?: Record<string, any>;
    enrollmentStart?: string;
    enrollmentEnd?: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.benefitsService.createPlan(orgId, body);
  }

  @Patch('plans/:id')
  @Roles('super_admin', 'admin')
  async updatePlan(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.benefitsService.updatePlan(orgId, id, body);
  }

  @Delete('plans/:id')
  @Roles('super_admin', 'admin')
  async deactivatePlan(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.benefitsService.deactivatePlan(orgId, id);
    return { success: true };
  }

  @Get('enrollments')
  @Roles('super_admin', 'admin')
  async listEnrollments(@Query('planId') planId?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.benefitsService.listEnrollments(orgId, planId);
  }

  @Get('enrollments/:employeeId')
  @Roles('super_admin', 'admin')
  async getEnrollmentsByEmployee(@Param('employeeId') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.benefitsService.getEnrollmentsByEmployee(orgId, employeeId);
  }
}
