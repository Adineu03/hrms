import { Controller, Post, Body, Request } from '@nestjs/common';
import { TalentAcquisitionAiService } from './ai.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';

@Controller('talent-acquisition/ai')
export class TalentAcquisitionAiController {
  constructor(private readonly aiService: TalentAcquisitionAiService) {}

  // Admin endpoints
  @Post('jd-generator')
  @Roles('admin')
  aiJdGenerator(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.aiJdGenerator(req.user.orgId, body.context);
  }

  @Post('sourcing-agent')
  @Roles('admin')
  sourcingAgent(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.sourcingAgent(req.user.orgId, body.context);
  }

  @Post('recruitment-forecasting')
  @Roles('admin')
  recruitmentForecasting(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.recruitmentForecasting(req.user.orgId, body.context);
  }

  @Post('bias-audit')
  @Roles('admin')
  biasAuditDashboard(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.biasAuditDashboard(req.user.orgId, body.context);
  }

  // Manager endpoints
  @Post('candidate-ranking')
  @Roles('admin', 'manager')
  candidateRanking(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.candidateRanking(req.user.orgId, body.context);
  }

  @Post('interview-analysis')
  @Roles('admin', 'manager')
  interviewTranscriptAnalysis(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.interviewTranscriptAnalysis(req.user.orgId, body.context);
  }

  @Post('offer-intelligence')
  @Roles('admin', 'manager')
  offerIntelligence(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.offerIntelligence(req.user.orgId, body.context);
  }

  @Post('diversity-nudges')
  @Roles('admin', 'manager')
  diversityPipelineNudges(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.diversityPipelineNudges(req.user.orgId, body.context);
  }

  // Employee endpoints
  @Post('smart-referral-match')
  smartReferralMatch(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.smartReferralMatch(req.user.orgId, body.context);
  }

  @Post('interview-prep')
  interviewPrepCopilot(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.interviewPrepCopilot(req.user.orgId, body.context);
  }

  @Post('internal-mobility')
  internalMobilityMatch(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.internalMobilityMatch(req.user.orgId, body.context);
  }
}
