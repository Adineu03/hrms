import { Controller, Get, Post, Body, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DemoWalkthroughService } from './demo-walkthrough.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('demo-company/manager/demo-walkthrough')
export class DemoWalkthroughController {
  constructor(
    private readonly service: DemoWalkthroughService,
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
  async getWalkthroughSteps() {
    return this.service.getWalkthroughSteps(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Post('complete')
  async markStepComplete(@Body() body: { stepId: string }) {
    return this.service.markStepComplete(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body.stepId);
  }
}
