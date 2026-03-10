import { Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DemoOnboardingTourService } from './demo-onboarding-tour.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('demo-company/employee/demo-onboarding-tour')
export class DemoOnboardingTourController {
  constructor(
    private readonly service: DemoOnboardingTourService,
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

  @Get('steps')
  async getTourSteps() {
    return this.service.getTourSteps(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Post('complete')
  async completeTour() {
    return this.service.completeTour(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
