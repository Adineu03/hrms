import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CertificationTrackerService } from './certification-tracker.service';

@Controller('learning-development/employee/certifications')
export class CertificationTrackerController {
  constructor(
    private readonly service: CertificationTrackerService,
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
    return this.service.listMyCertifications(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Post()
  async add(@Body() body: Record<string, any>) {
    return this.service.addCertification(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.updateCertification(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.deleteCertification(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id);
  }

  @Get('expiring')
  async getExpiring() {
    return this.service.getExpiringCertifications(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }
}
