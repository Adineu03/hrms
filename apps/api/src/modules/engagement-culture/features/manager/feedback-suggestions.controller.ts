import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { FeedbackSuggestionsService } from './feedback-suggestions.service';

@Roles('super_admin', 'admin', 'manager')
@Controller('engagement-culture/manager/feedback')
export class FeedbackSuggestionsController {
  constructor(
    private readonly service: FeedbackSuggestionsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async getTeamFeedback() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getTeamFeedback(orgId, userId);
  }

  @Post(':id/respond')
  async respondToFeedback(@Param('id') id: string, @Body() dto: { response: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.respondToFeedback(orgId, userId, id, dto.response);
  }

  @Post(':id/escalate')
  async escalateFeedback(@Param('id') id: string, @Body() dto: { reason?: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.escalateFeedback(orgId, userId, id, dto.reason);
  }

  @Get('suggestions')
  async getSuggestions() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getSuggestionTracking(orgId, userId);
  }
}
