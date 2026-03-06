import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SystemAdministrationService } from './system-administration.service';

@Roles('super_admin', 'admin')
@Controller('platform-experience/admin/system')
export class SystemAdministrationController {
  constructor(
    private readonly service: SystemAdministrationService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('health')
  async getSystemHealth() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSystemHealth(orgId);
  }

  @Get('sessions')
  async listActiveSessions() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listActiveSessions(orgId);
  }

  @Get('audit-logs')
  async listAuditLogs() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listAuditLogs(orgId);
  }

  @Get('bulk-operations')
  async getBulkOperations() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getBulkOperations(orgId);
  }

  @Post('bulk-operations')
  async triggerBulkOperation(@Body() dto: { type: string; targetIds?: string[]; params?: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.triggerBulkOperation(orgId, dto);
  }
}
