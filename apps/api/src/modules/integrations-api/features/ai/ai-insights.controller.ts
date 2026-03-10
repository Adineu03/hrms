import { Controller, Post, Body, Req } from '@nestjs/common';
import { IntegrationsAiInsightsService } from './ai-insights.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { orgId: string; userId: string; role: string };
}

@Controller('integrations-api/ai')
export class IntegrationsAiInsightsController {
  constructor(private readonly aiInsightsService: IntegrationsAiInsightsService) {}

  @Post('integration-intelligence')
  @Roles('admin', 'super_admin')
  async integrationIntelligence(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.integrationIntelligence(req.user.orgId, body.context);
  }

  @Post('api-usage-optimizer')
  @Roles('admin', 'super_admin')
  async apiUsageOptimizer(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.apiUsageOptimizer(req.user.orgId, body.context);
  }

  @Post('error-pattern-analyzer')
  @Roles('admin', 'super_admin')
  async errorPatternAnalyzer(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.errorPatternAnalyzer(req.user.orgId, body.context);
  }

  @Post('data-sync-health-monitor')
  @Roles('manager', 'admin', 'super_admin')
  async dataSyncHealthMonitor(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.dataSyncHealthMonitor(req.user.orgId, req.user.userId, body.context);
  }

  @Post('integration-status-assistant')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async integrationStatusAssistant(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.integrationStatusAssistant(req.user.orgId, req.user.userId, body.context);
  }
}
