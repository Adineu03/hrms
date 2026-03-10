import { Controller, Post, Body, Req } from '@nestjs/common';
import { ComplianceAiInsightsService } from './ai-insights.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { orgId: string; userId: string; role: string };
}

@Controller('compliance-audit/ai')
export class ComplianceAiInsightsController {
  constructor(private readonly aiInsightsService: ComplianceAiInsightsService) {}

  @Post('regulatory-change-monitor')
  @Roles('admin', 'super_admin')
  async regulatoryChangeMonitor(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.regulatoryChangeMonitor(req.user.orgId, body.context);
  }

  @Post('audit-risk-predictor')
  @Roles('admin', 'super_admin')
  async auditRiskPredictor(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.auditRiskPredictor(req.user.orgId, body.context);
  }

  @Post('compliance-gap-analysis')
  @Roles('admin', 'super_admin')
  async complianceGapAnalysis(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.complianceGapAnalysis(req.user.orgId, body.context);
  }

  @Post('auto-remediation-suggestions')
  @Roles('admin', 'super_admin')
  async autoRemediationSuggestions(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.autoRemediationSuggestions(req.user.orgId, body.context);
  }

  @Post('team-compliance-risk-score')
  @Roles('manager', 'admin', 'super_admin')
  async teamComplianceRiskScore(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.teamComplianceRiskScore(req.user.orgId, req.user.userId, body.context);
  }

  @Post('compliance-coach')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async complianceCoach(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.complianceCoach(req.user.orgId, req.user.userId, body.context);
  }
}
