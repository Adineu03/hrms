import { Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { FeatureHighlightsService } from './feature-highlights.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('demo-company/employee/feature-highlights')
export class FeatureHighlightsController {
  constructor(
    private readonly service: FeatureHighlightsService,
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
  async getHighlights() {
    return this.service.getHighlights(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Post('dismiss')
  async dismissHighlights() {
    return this.service.dismissHighlights(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
