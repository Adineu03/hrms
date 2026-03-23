import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SurveyParticipationService } from './survey-participation.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('engagement-culture/employee/surveys')
export class SurveyParticipationController {
  constructor(
    private readonly service: SurveyParticipationService,
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
  async listActiveSurveys() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listActiveSurveys(orgId, userId);
  }

  @Get('my-responses')
  async getMyResponses() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyResponses(orgId, userId);
  }

  @Get(':id')
  async getSurveyDetails(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSurveyDetails(orgId, id);
  }

  @Get(':id/questions')
  async getSurveyQuestions(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSurveyQuestions(orgId, id);
  }

  @Post(':id/submit')
  async submitResponse(@Param('id') id: string, @Body() dto: { answers: any[] }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitSurveyResponse(orgId, userId, id, dto);
  }

  @Post('feedback')
  async submitAnonymousFeedback(@Body() dto: { content: string; category?: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitAnonymousFeedback(orgId, userId, dto);
  }

  @Post('suggestion')
  async submitSuggestion(@Body() dto: { title: string; content: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitSuggestion(orgId, userId, dto);
  }
}
