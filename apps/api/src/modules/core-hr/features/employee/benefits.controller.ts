import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { EmployeeBenefitsService } from './benefits.service';

@Controller('core-hr/employee/benefits')
export class EmployeeBenefitsController {
  constructor(
    private readonly benefitsService: EmployeeBenefitsService,
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

  @Get('plans')
  async getAvailablePlans() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.benefitsService.getAvailablePlans(orgId, userId);
  }

  @Get('plans/:id')
  async getPlanDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.benefitsService.getPlanDetail(orgId, id);
  }

  @Get('my-enrollments')
  async getMyEnrollments() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.benefitsService.getMyEnrollments(orgId, userId);
  }

  @Post('enroll')
  async enroll(@Body() body: { planId: string; dependents?: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.benefitsService.enroll(orgId, userId, body);
  }
}
