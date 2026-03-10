import { Controller, Post, Body, Request } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { PeopleAnalyticsAiService } from './ai.service';

@Controller('people-analytics/ai')
export class PeopleAnalyticsAiController {
  constructor(private readonly aiService: PeopleAnalyticsAiService) {}

  // ── Employee endpoints ─────────────────────────────────────────────────────

  @Post('personal-growth-insights')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async personalGrowthInsights(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.personalGrowthInsights(req.user.orgId, req.user.userId);
  }

  // ── Manager endpoints ──────────────────────────────────────────────────────

  @Post('natural-language-analytics')
  @Roles('manager', 'admin', 'super_admin')
  async naturalLanguageAnalytics(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() body: { context?: Record<string, unknown>; question?: string },
  ) {
    const question = (body.context?.question as string | undefined) ?? body.question ?? "What is my team's attrition rate for the last 6 months?";
    return this.aiService.naturalLanguageAnalytics(req.user.orgId, req.user.userId, question);
  }

  @Post('predictive-team-insights')
  @Roles('manager', 'admin', 'super_admin')
  async predictiveTeamInsights(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.predictiveTeamInsights(req.user.orgId, req.user.userId);
  }

  @Post('anomaly-opportunity-spotter')
  @Roles('manager', 'admin', 'super_admin')
  async anomalyOpportunitySpotter(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.anomalyOpportunitySpotter(req.user.orgId, req.user.userId);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Post('predictive-workforce-intelligence')
  @Roles('admin', 'super_admin')
  async predictiveWorkforceIntelligence(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.predictiveWorkforceIntelligence(req.user.orgId);
  }

  @Post('automated-insights-engine')
  @Roles('admin', 'super_admin')
  async automatedInsightsEngine(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.automatedInsightsEngine(req.user.orgId);
  }

  @Post('natural-language-bi')
  @Roles('admin', 'super_admin')
  async naturalLanguageBi(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() body: { context?: Record<string, unknown>; question?: string },
  ) {
    const question = (body.context?.question as string | undefined) ?? body.question ?? "Show me gender pay gap by department controlling for grade and tenure";
    return this.aiService.naturalLanguageBi(req.user.orgId, question);
  }

  @Post('ai-storyteller')
  @Roles('admin', 'super_admin')
  async aiStoryteller(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.aiStoryteller(req.user.orgId);
  }
}
