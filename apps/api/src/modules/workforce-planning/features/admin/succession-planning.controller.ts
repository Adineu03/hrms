import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SuccessionPlanningService } from './succession-planning.service';

@Roles('super_admin', 'admin')
@Controller('workforce-planning/admin/succession-planning')
export class SuccessionPlanningController {
  constructor(
    private readonly service: SuccessionPlanningService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listSuccessionPlans() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listSuccessionPlans(orgId);
  }

  @Post()
  async createSuccessionPlan(
    @Body()
    dto: {
      positionTitle: string;
      departmentId?: string;
      currentHolderId?: string;
      criticalityLevel?: string;
      notes?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createSuccessionPlan(orgId, dto);
  }

  @Get(':id')
  async getSuccessionPlan(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSuccessionPlan(orgId, id);
  }

  @Patch(':id')
  async updateSuccessionPlan(
    @Param('id') id: string,
    @Body()
    dto: {
      positionTitle?: string;
      departmentId?: string;
      currentHolderId?: string;
      criticalityLevel?: string;
      notes?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateSuccessionPlan(orgId, id, dto);
  }

  @Delete(':id')
  async deleteSuccessionPlan(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteSuccessionPlan(orgId, id);
  }

  @Post(':id/candidates')
  async addCandidate(
    @Param('id') id: string,
    @Body()
    dto: {
      candidateEmployeeId: string;
      readinessLevel: string;
      performanceRating?: string;
      potentialRating?: string;
      flightRisk?: string;
      developmentNotes?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.addCandidate(orgId, id, dto);
  }

  @Patch(':id/candidates/:candidateId')
  async updateCandidate(
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
    @Body()
    dto: {
      readinessLevel?: string;
      performanceRating?: string;
      potentialRating?: string;
      flightRisk?: string;
      developmentNotes?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateCandidate(orgId, id, candidateId, dto);
  }

  @Delete(':id/candidates/:candidateId')
  async removeCandidate(@Param('id') id: string, @Param('candidateId') candidateId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.removeCandidate(orgId, id, candidateId);
  }

  @Post(':id/approve-candidate/:candidateId')
  async approveCandidate(@Param('id') id: string, @Param('candidateId') candidateId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.approveCandidate(orgId, id, candidateId);
  }
}
