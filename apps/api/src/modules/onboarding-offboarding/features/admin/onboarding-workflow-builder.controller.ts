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
import { OnboardingWorkflowBuilderService } from './onboarding-workflow-builder.service';

@Controller('onboarding-offboarding/admin/onboarding-workflows')
export class OnboardingWorkflowBuilderController {
  constructor(
    private readonly service: OnboardingWorkflowBuilderService,
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
    return this.service.listWorkflows(orgId, {
      status,
      departmentId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = body.createdBy ?? this.tenantService.getUserId?.() ?? orgId;
    return this.service.createWorkflow(orgId, createdBy, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getWorkflow(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateWorkflow(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.softDelete(orgId, id);
  }

  @Post(':id/tasks')
  @Roles('super_admin', 'admin')
  async addTask(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.addTask(orgId, id, body);
  }

  @Patch(':id/tasks/:taskId')
  @Roles('super_admin', 'admin')
  async updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateTask(orgId, id, taskId, body);
  }

  @Delete(':id/tasks/:taskId')
  @Roles('super_admin', 'admin')
  async removeTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.removeTask(orgId, id, taskId);
  }

  @Post(':id/clone')
  @Roles('super_admin', 'admin')
  async clone(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = body.createdBy ?? this.tenantService.getUserId?.() ?? orgId;
    return this.service.cloneWorkflow(orgId, id, createdBy);
  }
}
