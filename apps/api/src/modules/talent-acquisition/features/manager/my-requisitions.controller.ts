import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyRequisitionsService } from './my-requisitions.service';

@Controller('talent-acquisition/manager/requisitions')
export class MyRequisitionsController {
  constructor(
    private readonly service: MyRequisitionsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  async listRequisitions(@Query('status') status?: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listRequisitions(orgId, managerId, status);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async createRequisition(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.createRequisition(orgId, managerId, body);
  }

  @Get('budget')
  @Roles('super_admin', 'admin', 'manager')
  async getBudgetUtilization() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getBudgetUtilization(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getRequisitionDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getRequisitionDetail(orgId, managerId, id);
  }

  @Get(':id/pipeline')
  @Roles('super_admin', 'admin', 'manager')
  async getPipelineProgress(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getPipelineProgress(orgId, managerId, id);
  }
}
