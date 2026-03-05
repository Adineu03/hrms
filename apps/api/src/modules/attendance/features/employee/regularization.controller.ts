import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { RegularizationService } from './regularization.service';

@Controller('attendance/employee/regularizations')
export class RegularizationController {
  constructor(
    private readonly regularizationService: RegularizationService,
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

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submit(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.regularizationService.submit(orgId, userId, body);
  }

  @Get()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async list(
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.regularizationService.list(
      orgId,
      userId,
      status || undefined,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('missed-punches')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getMissedPunches(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.regularizationService.getMissedPunches(orgId, userId, startDate, endDate);
  }

  @Get('deadline')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getDeadline() {
    const orgId = this.getOrgIdOrThrow();
    return this.regularizationService.getDeadline(orgId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.regularizationService.getById(orgId, userId, id);
  }
}
