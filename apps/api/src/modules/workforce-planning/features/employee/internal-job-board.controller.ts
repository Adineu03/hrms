import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { InternalJobBoardService } from './internal-job-board.service';

@Roles('employee', 'manager', 'super_admin', 'admin')
@Controller('workforce-planning/employee/job-board')
export class InternalJobBoardController {
  constructor(
    private readonly service: InternalJobBoardService,
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
  async listOpenPositions() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listOpenPositions(orgId);
  }

  @Get(':id')
  async getPosition(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPosition(orgId, id);
  }

  @Post(':id/apply')
  async applyForPosition(@Param('id') id: string, @Body() dto: { coverNote?: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.applyForPosition(orgId, userId, id, dto);
  }
}
