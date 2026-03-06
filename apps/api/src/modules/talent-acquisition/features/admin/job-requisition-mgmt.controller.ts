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
import { JobRequisitionMgmtService } from './job-requisition-mgmt.service';

@Controller('talent-acquisition/admin/requisitions')
export class JobRequisitionMgmtController {
  constructor(
    private readonly service: JobRequisitionMgmtService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listRequisitions(orgId, {
      status,
      departmentId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('templates')
  @Roles('super_admin', 'admin')
  async getTemplates() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTemplates(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = body.createdBy ?? this.tenantService.getUserId?.() ?? orgId;
    return this.service.createRequisition(orgId, createdBy, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRequisition(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateRequisition(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.softDelete(orgId, id);
  }

  @Post(':id/submit')
  @Roles('super_admin', 'admin')
  async submit(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.submitForApproval(orgId, id);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'admin')
  async approve(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const approvedBy = body.approvedBy ?? this.tenantService.getUserId?.() ?? orgId;
    return this.service.approveRequisition(orgId, id, approvedBy);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'admin')
  async reject(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.rejectRequisition(orgId, id, body);
  }
}
