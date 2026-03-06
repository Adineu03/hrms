import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SurveyPulseManagementService } from './survey-pulse-management.service';

@Roles('super_admin', 'admin')
@Controller('engagement-culture/admin/surveys')
export class SurveyPulseManagementController {
  constructor(
    private readonly service: SurveyPulseManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  async list() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listSurveys(orgId);
  }

  @Post()
  async create(@Body() dto: { title: string; type?: string; description?: string; questions?: any[]; targetAudience?: any; isAnonymous?: boolean; scheduledAt?: string; closesAt?: string }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createSurvey(orgId, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: { title?: string; type?: string; description?: string; questions?: any[]; targetAudience?: any; isAnonymous?: boolean; scheduledAt?: string; closesAt?: string }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateSurvey(orgId, id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteSurvey(orgId, id);
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.publishSurvey(orgId, id);
  }

  @Get(':id/responses')
  async getResponses(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listResponses(orgId, id);
  }

  @Get('analytics')
  async getAnalytics() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSurveyAnalytics(orgId);
  }
}
