import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SelfReviewService } from './self-review.service';

@Controller('performance-growth/employee/self-review')
export class SelfReviewController {
  constructor(private readonly service: SelfReviewService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get() @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCurrent() { return this.service.getCurrentSelfReview(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('cycles') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCycles() { return this.service.getReviewCycles(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('previous') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPrevious() { return this.service.getPreviousSelfReviews(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Patch(':id') @Roles('super_admin', 'admin', 'manager', 'employee')
  async save(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.saveSelfReview(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }

  @Post(':id/submit') @Roles('super_admin', 'admin', 'manager', 'employee')
  async submit(@Param('id') id: string) { return this.service.submitSelfReview(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id); }

  @Get(':id/goal-data') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getGoalData(@Param('id') id: string) { return this.service.getGoalDataForReview(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id); }
}
