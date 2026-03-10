import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CareerPathExplorerService } from './career-path-explorer.service';

@Roles('employee', 'manager', 'super_admin', 'admin')
@Controller('workforce-planning/employee/career-path')
export class CareerPathExplorerController {
  constructor(
    private readonly service: CareerPathExplorerService,
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
  async getCareerPaths() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCareerPaths(orgId);
  }

  @Get('my-role')
  async getMyRoleInfo() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyRoleInfo(orgId, userId);
  }

  @Get('skills-gap')
  async getSkillsGap() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getSkillsGap(orgId, userId);
  }
}
