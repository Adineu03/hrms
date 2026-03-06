import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExpenseReportManagementService } from './expense-report-management.service';

@Roles('super_admin', 'admin')
@Controller('expense-management/admin/report-management')
export class ExpenseReportManagementController {
  constructor(
    private readonly service: ExpenseReportManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get('reports')
  async listReports(@Query('status') status?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listReports(orgId, status);
  }

  @Get('reports/:id')
  async getReportDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getReportDetail(orgId, id);
  }

  @Post('reports/:id/approve')
  async approveReport(
    @Param('id') id: string,
    @Body() dto: { comments?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.approveReport(orgId, id, userId, dto.comments);
  }

  @Post('reports/:id/reject')
  async rejectReport(
    @Param('id') id: string,
    @Body() dto: { reason: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.rejectReport(orgId, id, userId, dto.reason);
  }

  @Post('reports/:id/reimburse')
  async reimburseReport(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.reimburseReport(orgId, id, userId);
  }

  @Get('audit-trail/:reportId')
  async getAuditTrail(@Param('reportId') reportId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getAuditTrail(orgId, reportId);
  }
}
