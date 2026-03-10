import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PolicyManagementService } from './policy-management.service';

@Roles('super_admin', 'admin')
@Controller('compliance-audit/admin/policy-management')
export class PolicyManagementController {
  constructor(
    private readonly service: PolicyManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async listPolicies() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listPolicies(orgId);
  }

  @Post()
  async createPolicy(
    @Body()
    dto: {
      title: string;
      policyCode: string;
      category: string;
      description?: string;
      content?: string;
      version?: string;
      effectiveDate?: string;
      expiryDate?: string;
      mandatoryAcknowledgment?: boolean;
      reminderCadenceDays?: number;
      appliesToEntity?: string;
      appliesToLocation?: string;
      appliesToDepartment?: string;
      appliesToGrade?: string;
      jurisdiction?: string;
      language?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createPolicy(orgId, dto);
  }

  @Get(':id')
  async getPolicy(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPolicy(orgId, id);
  }

  @Patch(':id')
  async updatePolicy(
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      policyCode?: string;
      category?: string;
      description?: string;
      content?: string;
      version?: string;
      effectiveDate?: string;
      expiryDate?: string;
      mandatoryAcknowledgment?: boolean;
      reminderCadenceDays?: number;
      appliesToEntity?: string;
      appliesToLocation?: string;
      appliesToDepartment?: string;
      appliesToGrade?: string;
      jurisdiction?: string;
      language?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updatePolicy(orgId, id, dto);
  }

  @Delete(':id')
  async deletePolicy(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deletePolicy(orgId, id);
  }

  @Post(':id/publish')
  async publishPolicy(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.publishPolicy(orgId, id);
  }

  @Post(':id/archive')
  async archivePolicy(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.archivePolicy(orgId, id);
  }
}
