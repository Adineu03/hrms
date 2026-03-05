import {
  Controller,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { HeadcountService } from './headcount.service';

@Controller('core-hr/manager/headcount')
export class HeadcountController {
  constructor(
    private readonly headcountService: HeadcountService,
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
  async getDashboard() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.headcountService.getDashboard(orgId, managerId);
  }

  @Get('budget')
  @Roles('manager', 'admin', 'super_admin')
  async getBudget() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.headcountService.getBudget(orgId, managerId);
  }
}
