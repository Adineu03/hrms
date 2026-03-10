import { Controller, Post, Body, Request } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { DailyWorkLoggingAiService } from './ai.service';

@Controller('daily-work-logging/ai')
export class DailyWorkLoggingAiController {
  constructor(private readonly aiService: DailyWorkLoggingAiService) {}

  // ── Employee endpoints ─────────────────────────────────────────────────────

  @Post('auto-fill-timesheet')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async autoFillTimesheet(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.autoFillTimesheet(req.user.orgId, req.user.userId);
  }

  @Post('smart-categorization')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async smartCategorization(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.smartCategorization(req.user.orgId, req.user.userId);
  }

  @Post('gap-detector')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async gapDetector(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.gapDetector(req.user.orgId, req.user.userId);
  }

  @Post('productivity-insights')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async productivityInsights(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.productivityInsights(req.user.orgId, req.user.userId);
  }

  // ── Manager endpoints ──────────────────────────────────────────────────────

  @Post('utilization-optimizer')
  @Roles('manager', 'admin', 'super_admin')
  async utilizationOptimizer(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.utilizationOptimizer(req.user.orgId, req.user.userId);
  }

  @Post('budget-burn-predictor')
  @Roles('manager', 'admin', 'super_admin')
  async budgetBurnPredictor(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.budgetBurnPredictor(req.user.orgId, req.user.userId);
  }

  @Post('work-pattern-analysis')
  @Roles('manager', 'admin', 'super_admin')
  async workPatternAnalysis(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.workPatternAnalysis(req.user.orgId, req.user.userId);
  }

  @Post('entry-anomaly-detection')
  @Roles('manager', 'admin', 'super_admin')
  async entryAnomalyDetection(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.entryAnomalyDetection(req.user.orgId, req.user.userId);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Post('utilization-intelligence')
  @Roles('admin', 'super_admin')
  async utilizationIntelligence(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.utilizationIntelligence(req.user.orgId);
  }

  @Post('revenue-leakage-detector')
  @Roles('admin', 'super_admin')
  async revenueLeakageDetector(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.revenueLeakageDetector(req.user.orgId);
  }

  @Post('compliance-auto-check')
  @Roles('admin', 'super_admin')
  async complianceAutoCheck(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.complianceAutoCheck(req.user.orgId);
  }

  @Post('capacity-planner')
  @Roles('admin', 'super_admin')
  async capacityPlanner(
    @Request() req: { user: { orgId: string; userId: string } },
    @Body() _body: { context?: Record<string, unknown> },
  ) {
    return this.aiService.capacityPlanner(req.user.orgId);
  }
}
