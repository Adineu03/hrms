import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { RegulatoryComplianceService } from './regulatory-compliance.service';

@Roles('super_admin', 'admin')
@Controller('compliance-audit/admin/regulatory')
export class RegulatoryComplianceController {
  constructor(
    private readonly service: RegulatoryComplianceService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('checklists')
  async listChecklists() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listChecklists(orgId);
  }

  @Post('checklists')
  async createChecklist(
    @Body()
    dto: {
      title: string;
      jurisdiction: string;
      category: string;
      description?: string;
      dueDate?: string;
      frequency?: string;
      assignedTo?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createChecklist(orgId, dto);
  }

  @Patch('checklists/:id')
  async updateChecklist(
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      jurisdiction?: string;
      category?: string;
      description?: string;
      dueDate?: string;
      frequency?: string;
      assignedTo?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateChecklist(orgId, id, dto);
  }

  @Patch('checklists/:id/complete')
  async completeChecklist(
    @Param('id') id: string,
    @Body() dto: { evidenceNotes?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.completeChecklist(orgId, id, dto);
  }

  @Delete('checklists/:id')
  async deleteChecklist(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteChecklist(orgId, id);
  }

  @Get('calendar')
  async getFilingCalendar() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getFilingCalendar(orgId);
  }
}
