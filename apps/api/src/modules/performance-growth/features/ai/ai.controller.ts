import { Controller, Post, Body, Request } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { PerformanceGrowthAiService } from './ai.service';

@Controller('performance-growth/ai')
export class PerformanceGrowthAiController {
  constructor(private readonly aiService: PerformanceGrowthAiService) {}

  // ── Employee endpoints ─────────────────────────────────────────────────────

  @Post('review-draft')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async aiReviewDraft(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.aiReviewDraft(req.user.orgId, req.user.userId);
  }

  @Post('goal-suggestions')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async goalSuggestions(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.goalSuggestions(req.user.orgId, req.user.userId);
  }

  @Post('career-path-simulator')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async careerPathSimulator(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.careerPathSimulator(req.user.orgId, req.user.userId);
  }

  @Post('feedback-digest')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async feedbackDigest(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.feedbackDigest(req.user.orgId, req.user.userId);
  }

  // ── Manager endpoints ──────────────────────────────────────────────────────

  @Post('review-copilot')
  @Roles('manager', 'admin', 'super_admin')
  async reviewCopilot(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() body: { context?: Record<string, unknown>; employeeId?: string },
  ) {
    const employeeId = (body.context?.employeeId as string | undefined) ?? body.employeeId ?? req.user.userId;
    return this.aiService.reviewCopilot(req.user.orgId, req.user.userId, employeeId);
  }

  @Post('bias-detector')
  @Roles('manager', 'admin', 'super_admin')
  async biasDetector(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.biasDetector(req.user.orgId, req.user.userId);
  }

  @Post('calibration-copilot')
  @Roles('manager', 'admin', 'super_admin')
  async calibrationCopilot(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.calibrationCopilot(req.user.orgId, req.user.userId);
  }

  @Post('performance-trajectory')
  @Roles('manager', 'admin', 'super_admin')
  async performanceTrajectory(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.performanceTrajectory(req.user.orgId, req.user.userId);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Post('real-time-signals')
  @Roles('admin', 'super_admin')
  async realTimeSignals(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.realTimeSignals(req.user.orgId);
  }

  @Post('skills-gap-analysis')
  @Roles('admin', 'super_admin')
  async skillsGapAnalysis(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.skillsGapAnalysis(req.user.orgId);
  }

  @Post('review-quality-scorer')
  @Roles('admin', 'super_admin')
  async reviewQualityScorer(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.reviewQualityScorer(req.user.orgId);
  }

  @Post('promotion-equity-audit')
  @Roles('admin', 'super_admin')
  async promotionEquityAudit(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.promotionEquityAudit(req.user.orgId);
  }
}
