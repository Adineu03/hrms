import { Body, Controller, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { StatutoryComplianceService } from './statutory-compliance.service';

@Roles('super_admin', 'admin')
@Controller('payroll-processing/admin/statutory')
export class StatutoryComplianceController {
  constructor(
    private readonly service: StatutoryComplianceService,
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

  @Get('filings')
  async listFilings(
    @Query('type') type?: string,
    @Query('period') period?: string,
    @Query('status') status?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listFilings(orgId, { type, period, status });
  }

  @Post('filings')
  async createFiling(
    @Body() dto: { type: string; period: string; dueDate: string; amount?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createFiling(orgId, dto);
  }

  @Patch('filings/:id')
  async updateFiling(
    @Param('id') id: string,
    @Body() dto: { status?: string; challanNumber?: string; remarks?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateFiling(orgId, id, dto);
  }

  @Post('filings/:id/mark-filed')
  async markAsFiled(
    @Param('id') id: string,
    @Body() dto: { challanNumber?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.markAsFiled(orgId, id, { challanNumber: dto.challanNumber, filedBy: userId });
  }

  @Get('calendar')
  async getComplianceCalendar() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getComplianceCalendar(orgId);
  }

  @Get('tax-proofs')
  async listTaxProofs() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listTaxProofs(orgId);
  }

  @Patch('tax-proofs/:id')
  async verifyTaxProof(
    @Param('id') id: string,
    @Body() dto: { status: string; remarks?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.verifyTaxProof(orgId, id, dto, userId);
  }
}
