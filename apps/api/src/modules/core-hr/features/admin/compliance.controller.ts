import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ComplianceService } from './compliance.service';

@Controller('core-hr/admin/compliance')
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('dashboard')
  @Roles('super_admin', 'admin')
  async getDashboard() {
    const orgId = this.getOrgIdOrThrow();
    return this.complianceService.getDashboard(orgId);
  }

  @Get('document-retention')
  @Roles('super_admin', 'admin')
  async getDocumentRetention() {
    const orgId = this.getOrgIdOrThrow();
    return this.complianceService.getDocumentRetention(orgId);
  }

  @Post('document-retention')
  @Roles('super_admin', 'admin')
  async saveDocumentRetention(@Body() body: { policies: Record<string, any> }) {
    const orgId = this.getOrgIdOrThrow();
    return this.complianceService.saveDocumentRetention(orgId, body.policies);
  }

  @Get('training-tracking')
  @Roles('super_admin', 'admin')
  async getTrainingTracking() {
    const orgId = this.getOrgIdOrThrow();
    return this.complianceService.getTrainingTracking(orgId);
  }
}
