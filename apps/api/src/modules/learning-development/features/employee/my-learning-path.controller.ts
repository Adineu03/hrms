import { Controller, Get, Param, Patch, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyLearningPathService } from './my-learning-path.service';

@Controller('learning-development/employee/learning-paths')
export class MyLearningPathController {
  constructor(
    private readonly service: MyLearningPathService,
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
  async list() {
    return this.service.listMyPaths(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.service.getPathDetails(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id);
  }

  @Patch(':id/items/:itemId/complete')
  async markItemComplete(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.markItemComplete(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, itemId);
  }
}
