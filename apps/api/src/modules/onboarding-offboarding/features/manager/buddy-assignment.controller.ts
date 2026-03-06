import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { BuddyAssignmentService } from './buddy-assignment.service';

@Controller('onboarding-offboarding/manager/buddies')
export class BuddyAssignmentController {
  constructor(
    private readonly service: BuddyAssignmentService,
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
  async listBuddyAssignments() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listBuddyAssignments(orgId, managerId);
  }

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  async assignBuddy(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.assignBuddy(orgId, managerId, body);
  }

  @Get('effectiveness')
  @Roles('super_admin', 'admin', 'manager')
  async getEffectivenessMetrics() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getEffectivenessMetrics(orgId, managerId);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async reassignBuddy(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.reassignBuddy(orgId, managerId, id, body);
  }

  @Get(':id/interactions')
  @Roles('super_admin', 'admin', 'manager')
  async getBuddyInteractions(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.getBuddyInteractions(orgId, managerId, id);
  }

  @Post(':id/feedback')
  @Roles('super_admin', 'admin', 'manager')
  async submitBuddyFeedback(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.submitBuddyFeedback(orgId, managerId, id, body);
  }
}
