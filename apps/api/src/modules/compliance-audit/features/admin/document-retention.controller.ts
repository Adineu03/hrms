import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DocumentRetentionService } from './document-retention.service';

@Roles('super_admin', 'admin')
@Controller('compliance-audit/admin/document-retention')
export class DocumentRetentionController {
  constructor(
    private readonly service: DocumentRetentionService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('configs')
  async listRetentionConfigs() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listRetentionConfigs(orgId);
  }

  @Post('configs')
  async createRetentionConfig(
    @Body()
    dto: {
      entity: string;
      retentionDays?: number;
      isTracked?: boolean;
      trackCreate?: boolean;
      trackUpdate?: boolean;
      trackDelete?: boolean;
      trackView?: boolean;
      trackExport?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createRetentionConfig(orgId, dto);
  }

  @Patch('configs/:id')
  async updateRetentionConfig(
    @Param('id') id: string,
    @Body()
    dto: {
      entity?: string;
      retentionDays?: number;
      isTracked?: boolean;
      trackCreate?: boolean;
      trackUpdate?: boolean;
      trackDelete?: boolean;
      trackView?: boolean;
      trackExport?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateRetentionConfig(orgId, id, dto);
  }

  @Get('schedules')
  async getRetentionSchedules() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRetentionSchedules(orgId);
  }

  @Post('legal-hold')
  async applyLegalHold(
    @Body() dto: { entityType: string; entityId: string; reason: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.applyLegalHold(orgId, dto);
  }
}
