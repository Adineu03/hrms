import { Controller, Post, Body, Request } from '@nestjs/common';
import { CompensationRewardsAiService } from './ai.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';

@Controller('compensation-rewards/ai')
export class CompensationRewardsAiController {
  constructor(private readonly aiService: CompensationRewardsAiService) {}

  // Admin endpoints
  @Post('pay-equity')
  @Roles('admin')
  payEquityAnalyzer(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.payEquityAnalyzer(req.user.orgId, body.context);
  }

  @Post('total-rewards-optimizer')
  @Roles('admin')
  totalRewardsOptimizer(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.totalRewardsOptimizer(req.user.orgId, body.context);
  }

  @Post('scenario-planner')
  @Roles('admin')
  scenarioPlanner(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.scenarioPlanner(req.user.orgId, body.context);
  }

  @Post('market-intelligence')
  @Roles('admin')
  marketIntelligenceFeed(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.marketIntelligenceFeed(req.user.orgId, body.context);
  }

  // Manager endpoints
  @Post('smart-raise')
  @Roles('admin', 'manager')
  smartRaiseRecommender(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.smartRaiseRecommender(req.user.orgId, body.context);
  }

  @Post('retention-comp-model')
  @Roles('admin', 'manager')
  retentionCompModel(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.retentionCompModel(req.user.orgId, body.context);
  }

  @Post('recognition-nudges')
  @Roles('admin', 'manager')
  recognitionNudges(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.recognitionNudges(req.user.orgId, body.context);
  }

  // Employee endpoints
  @Post('comp-clarity')
  compClarityBot(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.compClarityBot(req.user.orgId, body.context);
  }

  @Post('tax-smart-insights')
  taxSmartInsights(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.taxSmartInsights(req.user.orgId, body.context);
  }

  @Post('rewards-recommender')
  rewardsRecommender(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.rewardsRecommender(req.user.orgId, body.context);
  }
}
