import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CompensationPlanningService } from './compensation-planning.service';

@Roles('super_admin', 'admin')
@Controller('compensation-rewards/admin/compensation-planning')
export class CompensationPlanningController {
  constructor(
    private readonly service: CompensationPlanningService,
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

  @Get('revisions')
  async listRevisions() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listRevisions(orgId);
  }

  @Post('revisions')
  async createRevision(@Body() dto: {
    title: string;
    type?: string;
    fiscalYear: string;
    effectiveDate?: string;
    totalBudget?: string;
    departments?: any[];
    grades?: any[];
  }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createRevision(orgId, userId, dto);
  }

  @Get('revisions/:id')
  async getRevisionDetails(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRevisionDetails(orgId, id);
  }

  @Patch('revisions/:id')
  async updateRevision(@Param('id') id: string, @Body() dto: {
    title?: string;
    type?: string;
    status?: string;
    effectiveDate?: string;
    totalBudget?: string;
    departments?: any[];
    grades?: any[];
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateRevision(orgId, id, dto);
  }

  @Delete('revisions/:id')
  async deleteRevision(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteRevision(orgId, id);
  }

  @Get('revisions/:id/items')
  async listRevisionItems(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listRevisionItems(orgId, id);
  }

  @Post('revisions/:id/items')
  async addRevisionItem(@Param('id') id: string, @Body() dto: {
    employeeId: string;
    currentCtc?: string;
    proposedCtc?: string;
    incrementPercent?: string;
    incrementAmount?: string;
    meritScore?: number;
    remarks?: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.addRevisionItem(orgId, id, dto);
  }

  @Patch('revisions/:id/items/:itemId')
  async updateRevisionItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: {
      proposedCtc?: string;
      incrementPercent?: string;
      incrementAmount?: string;
      meritScore?: number;
      status?: string;
      remarks?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateRevisionItem(orgId, id, itemId, { ...dto, approvedBy: dto.status === 'approved' ? userId : undefined });
  }

  @Get('budget')
  async getBudgetAllocation() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getBudgetAllocation(orgId);
  }

  @Post('merit-matrix')
  async saveMeritMatrix(@Body() dto: { revisionId: string; meritMatrix: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.saveMeritMatrix(orgId, dto.revisionId, dto.meritMatrix);
  }
}
