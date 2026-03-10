import { Body, Controller, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { AuditTrailLoggingService } from './audit-trail-logging.service';

@Roles('super_admin', 'admin')
@Controller('compliance-audit/admin/audit-trail')
export class AuditTrailLoggingController {
  constructor(
    private readonly service: AuditTrailLoggingService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('logs')
  async listAuditLogs(
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listAuditLogs(orgId, {
      module,
      userId,
      action,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('configs')
  async listTrailConfigs() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listTrailConfigs(orgId);
  }

  @Post('configs')
  async createTrailConfig(
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
    return this.service.createTrailConfig(orgId, dto);
  }

  @Patch('configs/:id')
  async updateTrailConfig(
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
    return this.service.updateTrailConfig(orgId, id, dto);
  }

  @Get('export')
  async exportAuditLogs(
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.exportAuditLogs(orgId, { module, userId, action, startDate, endDate });
  }
}
