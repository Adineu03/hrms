import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { HandoverMgmtService } from './handover-mgmt.service';

@Controller('onboarding-offboarding/employee/handover')
export class HandoverMgmtController {
  constructor(
    private readonly service: HandoverMgmtService,
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
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOverview() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOverview(orgId, userId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async createHandover(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createHandover(orgId, userId, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getHandoverDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getHandoverDetail(orgId, userId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async updateHandover(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateHandover(orgId, userId, id, body);
  }

  @Post(':id/tasks')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async addTasks(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.addTasks(orgId, userId, id, body);
  }

  @Post(':id/successors')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async assignSuccessors(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.assignSuccessors(orgId, userId, id, body);
  }

  @Post(':id/credentials')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async shareCredentials(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.shareCredentials(orgId, userId, id, body);
  }

  @Post(':id/pending-items')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async addPendingItems(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.addPendingItems(orgId, userId, id, body);
  }

  @Post(':id/submit')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitHandover(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitHandover(orgId, userId, id);
  }

  @Get(':id/status')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getHandoverStatus(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getHandoverStatus(orgId, userId, id);
  }
}
