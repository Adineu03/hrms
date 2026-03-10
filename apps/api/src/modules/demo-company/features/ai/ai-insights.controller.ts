import { Controller, Post, Body, Req } from '@nestjs/common';
import { DemoAiInsightsService } from './ai-insights.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { orgId: string; userId: string; role: string };
}

@Controller('demo-company/ai')
export class DemoAiInsightsController {
  constructor(private readonly aiInsightsService: DemoAiInsightsService) {}

  @Post('demo-ai-features-showcase')
  @Roles('admin', 'super_admin')
  async demoAiFeaturesShowcase(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.demoAiFeaturesShowcase(req.user.orgId, body.context);
  }

  @Post('synthetic-data-intelligence')
  @Roles('admin', 'super_admin')
  async syntheticDataIntelligence(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.syntheticDataIntelligence(req.user.orgId, body.context);
  }

  @Post('demo-team-analytics')
  @Roles('manager', 'admin', 'super_admin')
  async demoTeamAnalytics(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.demoTeamAnalytics(req.user.orgId, req.user.userId, body.context);
  }

  @Post('demo-ai-insights-showcase')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async demoAiInsightsShowcase(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.demoAiInsightsShowcase(req.user.orgId, req.user.userId, body.context);
  }
}
