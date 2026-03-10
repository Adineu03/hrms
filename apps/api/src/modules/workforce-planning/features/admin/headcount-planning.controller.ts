import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { HeadcountPlanningService } from './headcount-planning.service';

@Roles('super_admin', 'admin')
@Controller('workforce-planning/admin/headcount-planning')
export class HeadcountPlanningController {
  constructor(
    private readonly service: HeadcountPlanningService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listPlans() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listPlans(orgId);
  }

  @Post()
  async createPlan(
    @Body()
    dto: {
      planName: string;
      planYear: number;
      departmentId?: string;
      locationId?: string;
      gradeId?: string;
      entityId?: string;
      currentHeadcount: number;
      approvedHeadcount: number;
      targetHeadcount: number;
      openRequisitions?: number;
      hiringFreezeActive?: boolean;
      hiringFreezeReason?: string;
      notes?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createPlan(orgId, dto);
  }

  @Get(':id')
  async getPlan(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPlan(orgId, id);
  }

  @Patch(':id')
  async updatePlan(
    @Param('id') id: string,
    @Body()
    dto: {
      planName?: string;
      planYear?: number;
      departmentId?: string;
      locationId?: string;
      gradeId?: string;
      entityId?: string;
      currentHeadcount?: number;
      approvedHeadcount?: number;
      targetHeadcount?: number;
      openRequisitions?: number;
      hiringFreezeActive?: boolean;
      hiringFreezeReason?: string;
      notes?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updatePlan(orgId, id, dto);
  }

  @Delete(':id')
  async deletePlan(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deletePlan(orgId, id);
  }

  @Post(':id/approve')
  async approvePlan(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.approvePlan(orgId, id);
  }

  @Post(':id/freeze')
  async toggleFreeze(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.toggleFreeze(orgId, id);
  }
}
