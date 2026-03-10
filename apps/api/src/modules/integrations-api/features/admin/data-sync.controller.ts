import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DataSyncService } from './data-sync.service';

@Roles('super_admin', 'admin')
@Controller('integrations-api/admin/data-sync')
export class DataSyncController {
  constructor(
    private readonly service: DataSyncService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listSyncConfigs() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listSyncConfigs(orgId);
  }

  @Post()
  async createSyncConfig(
    @Body()
    dto: {
      connectorId?: string;
      syncName: string;
      sourceType: string;
      targetType: string;
      frequency?: string;
      fieldMapping?: Record<string, string>;
      filterCriteria?: Record<string, unknown>;
      isEnabled?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createSyncConfig(orgId, dto);
  }

  @Get(':id')
  async getSyncConfig(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSyncConfig(orgId, id);
  }

  @Patch(':id')
  async updateSyncConfig(
    @Param('id') id: string,
    @Body()
    dto: {
      connectorId?: string;
      syncName?: string;
      sourceType?: string;
      targetType?: string;
      frequency?: string;
      fieldMapping?: Record<string, string>;
      filterCriteria?: Record<string, unknown>;
      isEnabled?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateSyncConfig(orgId, id, dto);
  }

  @Delete(':id')
  async deleteSyncConfig(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteSyncConfig(orgId, id);
  }

  @Post(':id/trigger')
  async triggerSync(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.triggerSync(orgId, id);
  }
}
