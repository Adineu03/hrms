import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyApplicationsService } from './my-applications.service';

@Controller('talent-acquisition/employee/applications')
export class MyApplicationsController {
  constructor(
    private readonly service: MyApplicationsService,
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
  async listApplications() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listApplications(orgId, userId);
  }

  @Get('history')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getApplicationHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getApplicationHistory(orgId, userId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getApplicationDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getApplicationDetail(orgId, userId, id);
  }

  @Post(':id/withdraw')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async withdrawApplication(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.withdrawApplication(orgId, userId, id, body);
  }

  @Get(':id/timeline')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getApplicationTimeline(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getApplicationTimeline(orgId, userId, id);
  }
}
