import { Controller, Post, Body, Request } from '@nestjs/common';
import { OnboardingOffboardingAiService } from './ai.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';

@Controller('onboarding-offboarding/ai')
export class OnboardingOffboardingAiController {
  constructor(private readonly aiService: OnboardingOffboardingAiService) {}

  // Admin endpoints
  @Post('process-optimization')
  @Roles('admin')
  processOptimization(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.processOptimization(req.user.orgId, body.context);
  }

  @Post('exit-interview-analyzer')
  @Roles('admin')
  exitInterviewAnalyzer(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.exitInterviewAnalyzer(req.user.orgId, body.context);
  }

  @Post('attrition-model')
  @Roles('admin')
  predictiveAttritionModel(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.predictiveAttritionModel(req.user.orgId, body.context);
  }

  // Manager endpoints
  @Post('onboarding-risk-alert')
  @Roles('admin', 'manager')
  onboardingRiskAlert(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.onboardingRiskAlert(req.user.orgId, body.context);
  }

  @Post('smart-knowledge-transfer')
  @Roles('admin', 'manager')
  smartKnowledgeTransfer(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.smartKnowledgeTransfer(req.user.orgId, body.context);
  }

  @Post('exit-prediction')
  @Roles('admin', 'manager')
  exitPrediction(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.exitPrediction(req.user.orgId, body.context);
  }

  // Employee endpoints
  @Post('personalized-onboarding')
  personalizedOnboarding(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.personalizedOnboarding(req.user.orgId, body.context);
  }

  @Post('onboarding-buddy')
  aiOnboardingBuddy(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.aiOnboardingBuddy(req.user.orgId, body.context);
  }

  @Post('sentiment-tracking')
  sentimentTracking(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.sentimentTracking(req.user.orgId, body.context);
  }
}
