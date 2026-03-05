import {
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyProfileService } from './my-profile.service';

@Controller('core-hr/employee/profile')
export class MyProfileController {
  constructor(
    private readonly myProfileService: MyProfileService,
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
  async getProfile() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.myProfileService.getProfile(orgId, userId);
  }

  @Patch()
  async updateProfile(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.myProfileService.updateProfile(orgId, userId, body);
  }

  @Get('completeness')
  async getCompleteness() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.myProfileService.getCompleteness(orgId, userId);
  }

  @Get('edit-history')
  async getEditHistory() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.myProfileService.getEditHistory(orgId, userId);
  }
}
