import { Controller, Get, Post, Patch, Param, Body, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ReviewFeedbackService } from './review-feedback.service';

@Controller('performance-growth/manager/reviews')
export class ReviewFeedbackController {
  constructor(
    private readonly service: ReviewFeedbackService,
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
  @Roles('super_admin', 'admin', 'manager')
  async listPendingReviews() {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.listPendingReviews(orgId, managerId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager')
  async getReviewAssignment(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getReviewAssignment(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'manager')
  async submitManagerReview(@Param('id') id: string, @Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.submitManagerReview(orgId, managerId, id, body);
  }

  @Get(':id/peer-feedback')
  @Roles('super_admin', 'admin', 'manager')
  async getPeerFeedbackForEmployee(@Param('id') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPeerFeedbackForEmployee(orgId, employeeId);
  }

  @Get(':id/history')
  @Roles('super_admin', 'admin', 'manager')
  async getReviewHistory(@Param('id') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getReviewHistory(orgId, employeeId);
  }

  @Post('feedback')
  @Roles('super_admin', 'admin', 'manager')
  async giveContinuousFeedback(@Body() body: any) {
    const orgId = this.getOrgIdOrThrow();
    const managerId = this.getUserIdOrThrow();
    return this.service.giveContinuousFeedback(orgId, managerId, body);
  }
}
