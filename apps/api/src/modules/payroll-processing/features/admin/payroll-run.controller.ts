import { Body, Controller, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { PayrollRunService } from './payroll-run.service';

@Roles('super_admin', 'admin')
@Controller('payroll-processing/admin/runs')
export class PayrollRunController {
  constructor(
    private readonly service: PayrollRunService,
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

  @Get()
  async listRuns(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listRuns(orgId, {
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      status,
    });
  }

  @Post()
  async createRun(@Body() dto: { month: number; year: number }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createRun(orgId, dto, userId);
  }

  @Get(':id')
  async getRunDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRunDetail(orgId, id);
  }

  @Post(':id/process')
  async processRun(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.processRun(orgId, id, userId);
  }

  @Post(':id/approve')
  async approveRun(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.approveRun(orgId, id, userId);
  }

  @Post(':id/finalize')
  async finalizeRun(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.finalizeRun(orgId, id, userId);
  }

  @Post(':id/lock')
  async lockRun(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.lockRun(orgId, id);
  }

  @Get(':id/entries')
  async listEntries(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listEntries(orgId, id);
  }

  @Patch(':id/entries/:entryId')
  async updateEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body()
    dto: {
      otherEarnings?: string;
      otherDeductions?: string;
      overtimeAmount?: string;
      bonusAmount?: string;
      arrearsAmount?: string;
      reimbursementAmount?: string;
      lossOfPayDays?: number;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateEntry(orgId, id, entryId, dto);
  }
}
