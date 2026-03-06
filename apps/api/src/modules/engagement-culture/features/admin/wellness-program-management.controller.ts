import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { WellnessProgramManagementService } from './wellness-program-management.service';

@Roles('super_admin', 'admin')
@Controller('engagement-culture/admin/wellness')
export class WellnessProgramManagementController {
  constructor(
    private readonly service: WellnessProgramManagementService,
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
    return this.service.listWellnessPrograms(orgId);
  }

  @Post()
  async create(@Body() dto: { name: string; type?: string; description?: string; startDate?: string; endDate?: string; budget?: string; maxParticipants?: number; resources?: any[]; schedule?: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createWellnessProgram(orgId, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: { name?: string; type?: string; description?: string; startDate?: string; endDate?: string; budget?: string; maxParticipants?: number; resources?: any[]; schedule?: any }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateWellnessProgram(orgId, id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteWellnessProgram(orgId, id);
  }

  @Get(':id/participants')
  async getParticipants(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listParticipants(orgId, id);
  }

  @Get('calendar')
  async getCalendar() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getWellnessCalendar(orgId);
  }

  @Get('budget')
  async getBudget() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getBudgetSummary(orgId);
  }
}
