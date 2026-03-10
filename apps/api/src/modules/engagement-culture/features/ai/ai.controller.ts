import { Controller, Post, Body, Request } from '@nestjs/common';
import { EngagementCultureAiService } from './ai.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';

@Controller('engagement-culture/ai')
export class EngagementCultureAiController {
  constructor(private readonly aiService: EngagementCultureAiService) {}

  // Admin endpoints
  @Post('sentiment-analysis')
  @Roles('admin')
  sentimentAnalysisEngine(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.sentimentAnalysisEngine(req.user.orgId, body.context);
  }

  @Post('culture-health-score')
  @Roles('admin')
  cultureHealthScore(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.cultureHealthScore(req.user.orgId, body.context);
  }

  @Post('attrition-model')
  @Roles('admin')
  orgWideAttritionModel(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.orgWideAttritionModel(req.user.orgId, body.context);
  }

  @Post('engagement-roi')
  @Roles('admin')
  engagementRoiCalculator(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.engagementRoiCalculator(req.user.orgId, body.context);
  }

  // Manager endpoints
  @Post('engagement-drivers')
  @Roles('admin', 'manager')
  engagementDriverAnalysis(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.engagementDriverAnalysis(req.user.orgId, body.context);
  }

  @Post('smart-nudges')
  @Roles('admin', 'manager')
  smartNudges(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.smartNudges(req.user.orgId, body.context);
  }

  @Post('attrition-risk')
  @Roles('admin', 'manager')
  attritionRiskDashboard(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.attritionRiskDashboard(req.user.orgId, body.context);
  }

  @Post('feedback-summary')
  @Roles('admin', 'manager')
  feedbackSummary(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.feedbackSummary(req.user.orgId, body.context);
  }

  // Employee endpoints
  @Post('personalized-wellness')
  personalizedWellness(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.personalizedWellness(req.user.orgId, body.context);
  }

  @Post('anonymous-voice')
  anonymousVoiceInsights(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.anonymousVoiceInsights(req.user.orgId, body.context);
  }

  @Post('culture-match-pulse')
  cultureMatchPulse(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.cultureMatchPulse(req.user.orgId, body.context);
  }
}
