import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CareerProfileService } from './career-profile.service';

@Controller('talent-acquisition/employee/profile')
export class CareerProfileController {
  constructor(
    private readonly service: CareerProfileService,
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
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCareerProfile() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCareerProfile(orgId, userId);
  }

  @Patch()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async updateCareerProfile(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateCareerProfile(orgId, userId, body);
  }

  @Post('resume')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async uploadResume(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.uploadResume(orgId, userId, body);
  }

  @Delete('resume/:id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async deleteResume(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.deleteResume(orgId, userId, id);
  }

  @Patch('preferences')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async updatePreferences(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updatePreferences(orgId, userId, body);
  }

  @Patch('visibility')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async updateVisibility(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateVisibility(orgId, userId, body);
  }
}
