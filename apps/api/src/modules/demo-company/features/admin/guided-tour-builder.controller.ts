import { Controller, Get, Post, Patch, Delete, Body, Param, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { GuidedTourBuilderService } from './guided-tour-builder.service';

@Roles('super_admin', 'admin')
@Controller('demo-company/admin/guided-tour-builder')
export class GuidedTourBuilderController {
  constructor(
    private readonly service: GuidedTourBuilderService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async getTours() {
    return this.service.getTours(this.getOrgIdOrThrow());
  }

  @Post()
  async createTour(
    @Body()
    body: {
      tourName: string;
      targetModule: string;
      assignedPersona: string;
      steps: Array<{ order: number; targetSelector: string; tooltipText: string; title: string }>;
    },
  ) {
    return this.service.createTour(this.getOrgIdOrThrow(), body);
  }

  @Patch(':id')
  async updateTour(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateTour(this.getOrgIdOrThrow(), id, body);
  }

  @Post(':id/publish')
  async publishTour(@Param('id') id: string) {
    return this.service.publishTour(this.getOrgIdOrThrow(), id);
  }

  @Delete(':id')
  async deleteTour(@Param('id') id: string) {
    return this.service.deleteTour(this.getOrgIdOrThrow(), id);
  }
}
