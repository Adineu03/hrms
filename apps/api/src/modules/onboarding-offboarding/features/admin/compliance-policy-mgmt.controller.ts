import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CompliancePolicyMgmtService } from './compliance-policy-mgmt.service';

@Controller('onboarding-offboarding/admin/compliance')
export class CompliancePolicyMgmtController {
  constructor(
    private readonly service: CompliancePolicyMgmtService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('acknowledgements')
  @Roles('super_admin', 'admin')
  async getAcknowledgements(
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getAcknowledgements(orgId, {
      employeeId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('training-completion')
  @Roles('super_admin', 'admin')
  async getTrainingCompletion(@Query('departmentId') departmentId?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTrainingCompletion(orgId, { departmentId });
  }

  @Get('regulatory-checklist')
  @Roles('super_admin', 'admin')
  async getRegulatoryChecklist(@Query('jurisdiction') jurisdiction?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRegulatoryChecklist(orgId, { jurisdiction });
  }

  @Get('audit-trail')
  @Roles('super_admin', 'admin')
  async getAuditTrail(
    @Query('entityType') entityType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getAuditTrail(orgId, {
      entityType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('data-retention')
  @Roles('super_admin', 'admin')
  async getDataRetention() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getDataRetention(orgId);
  }

  @Post('policies')
  @Roles('super_admin', 'admin')
  async createPolicy(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createPolicy(orgId, body);
  }

  @Patch('policies/:id')
  @Roles('super_admin', 'admin')
  async updatePolicy(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updatePolicy(orgId, id, body);
  }
}
