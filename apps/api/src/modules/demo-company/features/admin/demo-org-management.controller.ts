import { Controller, Get, Post, Delete, Body, Param, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DemoOrgManagementService } from './demo-org-management.service';

@Roles('super_admin', 'admin')
@Controller('demo-company/admin/demo-org-management')
export class DemoOrgManagementController {
  constructor(
    private readonly service: DemoOrgManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getDemoOrgs() {
    return this.service.getDemoOrgs(this.getOrgIdOrThrow());
  }

  @Post()
  async createDemoOrg(@Body() body: { sandboxName: string; industryTemplate: string; employeeCount: number }) {
    return this.service.createDemoOrg(this.getOrgIdOrThrow(), body);
  }

  @Post(':id/reset')
  async resetDemoOrg(@Param('id') id: string) {
    return this.service.resetDemoOrg(this.getOrgIdOrThrow(), id);
  }

  @Delete(':id')
  async deleteDemoOrg(@Param('id') id: string) {
    return this.service.deleteDemoOrg(this.getOrgIdOrThrow(), id);
  }
}
