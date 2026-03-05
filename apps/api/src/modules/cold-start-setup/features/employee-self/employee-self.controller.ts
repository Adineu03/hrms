import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { EmployeeProfileData } from '@hrms/shared';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { EmployeeSelfService } from './employee-self.service';

@Controller('cold-start/my-profile')
export class EmployeeSelfController {
  constructor(
    private readonly employeeSelfService: EmployeeSelfService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return userId;
  }

  @Get()
  async getProfile() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.employeeSelfService.getProfile(orgId, userId);
  }

  @Patch()
  async updateProfile(@Body() body: Partial<EmployeeProfileData>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.employeeSelfService.updateProfile(orgId, userId, body);
  }

  @Get('onboarding-status')
  async getOnboardingStatus() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.employeeSelfService.getOnboardingStatus(orgId, userId);
  }

  @Post('onboarding/:stepId')
  async completeOnboardingStep(@Param('stepId') stepId: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    await this.employeeSelfService.completeOnboardingStep(
      orgId,
      userId,
      stepId,
    );
    return { success: true };
  }
}
