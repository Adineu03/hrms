import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyReviewsService } from './my-reviews.service';

@Controller('performance-growth/employee/my-reviews')
export class MyReviewsController {
  constructor(private readonly service: MyReviewsService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get() @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCurrent() { return this.service.getCurrentReview(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('completed') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCompleted() { return this.service.getCompletedReviews(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('comparison') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getComparison() { return this.service.getYearOverYearComparison(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get(':id') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getDetail(@Param('id') id: string) { return this.service.getReviewDetail(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id); }

  @Post(':id/acknowledge') @Roles('super_admin', 'admin', 'manager', 'employee')
  async acknowledge(@Param('id') id: string) { return this.service.acknowledgeReview(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id); }

  @Post(':id/appeal') @Roles('super_admin', 'admin', 'manager', 'employee')
  async appeal(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.appealReview(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }
}
