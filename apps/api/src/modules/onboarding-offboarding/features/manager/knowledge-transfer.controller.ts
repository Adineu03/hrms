import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { KnowledgeTransferService } from './knowledge-transfer.service';

@Controller('onboarding-offboarding/manager/knowledge-transfer')
export class KnowledgeTransferController {
  constructor(
    private readonly service: KnowledgeTransferService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  @Roles('super_admin', 'admin', 'manager')
  async listTransferPlans() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listTransferPlans(orgId, managerId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async createTransferPlan(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.createTransferPlan(orgId, managerId, body);
  }

  @Get('completion-status')
  @Roles('super_admin', 'admin', 'manager')
  async getCompletionStatus() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getCompletionStatus(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getTransferDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getTransferDetail(orgId, managerId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async updateTransferPlan(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.updateTransferPlan(orgId, managerId, id, body);
  }

  @Post(':id/items')
  @Roles('super_admin', 'admin', 'manager')
  async addTransferItem(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.addTransferItem(orgId, managerId, id, body);
  }

  @Patch(':id/items/:itemId')
  @Roles('super_admin', 'admin', 'manager')
  async updateTransferItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.updateTransferItem(orgId, managerId, id, itemId, body);
  }
}
