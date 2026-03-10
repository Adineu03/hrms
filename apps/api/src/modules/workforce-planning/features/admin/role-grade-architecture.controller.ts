import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { RoleGradeArchitectureService } from './role-grade-architecture.service';

@Roles('super_admin', 'admin')
@Controller('workforce-planning/admin/role-grade-architecture')
export class RoleGradeArchitectureController {
  constructor(
    private readonly service: RoleGradeArchitectureService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('families')
  async getJobFamilies() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getJobFamilies(orgId);
  }

  @Get()
  async listRoles() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listRoles(orgId);
  }

  @Post()
  async createRole(
    @Body()
    dto: {
      roleTitle: string;
      jobFamily: string;
      jobFunction?: string;
      gradeCode: string;
      gradeLevel: number;
      salaryRangeMin?: number;
      salaryRangeMax?: number;
      salaryRangeMid?: number;
      currency?: string;
      roleDescription?: string;
      keyResponsibilities?: string[];
      competencyRequirements?: string[];
      typicalExperienceYears?: string;
      isManagerialRole?: boolean;
      reportingToGradeCode?: string;
      progressionPaths?: unknown;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createRole(orgId, dto);
  }

  @Get(':id')
  async getRole(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRole(orgId, id);
  }

  @Patch(':id')
  async updateRole(
    @Param('id') id: string,
    @Body()
    dto: {
      roleTitle?: string;
      jobFamily?: string;
      jobFunction?: string;
      gradeCode?: string;
      gradeLevel?: number;
      salaryRangeMin?: number;
      salaryRangeMax?: number;
      salaryRangeMid?: number;
      currency?: string;
      roleDescription?: string;
      keyResponsibilities?: string[];
      competencyRequirements?: string[];
      typicalExperienceYears?: string;
      isManagerialRole?: boolean;
      reportingToGradeCode?: string;
      progressionPaths?: unknown;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateRole(orgId, id, dto);
  }

  @Delete(':id')
  async deleteRole(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteRole(orgId, id);
  }
}
