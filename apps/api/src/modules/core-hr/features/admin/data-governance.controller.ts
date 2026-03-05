import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DataGovernanceService } from './data-governance.service';

@Controller('core-hr/admin/data-governance')
export class DataGovernanceController {
  constructor(
    private readonly dataGovernanceService: DataGovernanceService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('audit-logs')
  @Roles('super_admin', 'admin')
  async getAuditLogs(
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.dataGovernanceService.getAuditLogs(orgId, {
      entity,
      action,
      userId,
      from,
      to,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('field-access')
  @Roles('super_admin', 'admin')
  async getFieldAccess() {
    const orgId = this.getOrgIdOrThrow();
    return this.dataGovernanceService.getFieldAccess(orgId);
  }

  @Post('field-access')
  @Roles('super_admin', 'admin')
  async saveFieldAccess(@Body() body: { rules: Record<string, any> }) {
    const orgId = this.getOrgIdOrThrow();
    return this.dataGovernanceService.saveFieldAccess(orgId, body.rules);
  }

  @Post('data-export')
  @Roles('super_admin', 'admin')
  async requestDataExport(@Body() body: {
    entity: string;
    fields: string[];
    filters?: Record<string, any>;
    format: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.dataGovernanceService.requestDataExport(orgId, body);
  }

  @Get('consent')
  @Roles('super_admin', 'admin')
  async getConsent() {
    const orgId = this.getOrgIdOrThrow();
    return this.dataGovernanceService.getConsent(orgId);
  }

  @Post('consent/:employeeId')
  @Roles('super_admin', 'admin')
  async recordConsent(
    @Param('employeeId') employeeId: string,
    @Body() body: { action: string; details?: Record<string, any> },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.dataGovernanceService.recordConsent(orgId, employeeId, body);
  }
}
