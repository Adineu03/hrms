import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { TeamRegularizationService } from './team-regularization.service';

@Controller('attendance/manager/regularizations')
export class TeamRegularizationController {
  constructor(
    private readonly teamRegularizationService: TeamRegularizationService,
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
  @Roles('manager', 'admin', 'super_admin')
  async listRequests(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamRegularizationService.listRequests(orgId, managerId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch(':id')
  @Roles('manager', 'admin', 'super_admin')
  async handleRequest(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamRegularizationService.handleRequest(orgId, managerId, id, body as any);
  }

  @Post('bulk-action')
  @Roles('manager', 'admin', 'super_admin')
  async bulkAction(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamRegularizationService.bulkAction(orgId, managerId, body as any);
  }

  @Get('history')
  @Roles('manager', 'admin', 'super_admin')
  async getHistory(
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.teamRegularizationService.getHistory(orgId, managerId, {
      employeeId,
      startDate,
      endDate,
    });
  }
}
