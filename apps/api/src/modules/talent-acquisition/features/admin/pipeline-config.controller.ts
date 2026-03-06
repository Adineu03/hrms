import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PipelineConfigService } from './pipeline-config.service';

@Controller('talent-acquisition/admin/pipeline')
export class PipelineConfigController {
  constructor(
    private readonly service: PipelineConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async listDefaults() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listDefaultStages(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createStage(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateStage(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.softDeleteStage(orgId, id);
  }

  @Post('reorder')
  @Roles('super_admin', 'admin')
  async reorder(@Body() body: { stages: { id: string; sortOrder: number }[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.reorderStages(orgId, body.stages);
  }

  @Get('requisition/:requisitionId')
  @Roles('super_admin', 'admin')
  async getRequisitionStages(@Param('requisitionId') requisitionId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRequisitionStages(orgId, requisitionId);
  }

  @Post('requisition/:requisitionId/copy-defaults')
  @Roles('super_admin', 'admin')
  async copyDefaults(@Param('requisitionId') requisitionId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.copyDefaultsToRequisition(orgId, requisitionId);
  }
}
