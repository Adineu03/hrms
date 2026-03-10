import { Controller, Post, Body, Request } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CoreHrAiService } from './ai.service';

@Controller('core-hr/ai')
export class CoreHrAiController {
  constructor(private readonly coreHrAiService: CoreHrAiService) {}

  // ─── Employee Endpoints ───────────────────────────────────────────────────

  @Post('profile-assistant')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async profileAssistant(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.profileAssistant(req.user.orgId, req.user.userId, body.context);
  }

  @Post('benefits-recommender')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async benefitsRecommender(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.benefitsRecommender(req.user.orgId, req.user.userId, body.context);
  }

  @Post('smart-document-search')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async smartDocumentSearch(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.smartDocumentSearch(req.user.orgId, req.user.userId, body.context);
  }

  @Post('tax-optimization-hints')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async taxOptimizationHints(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.taxOptimizationHints(req.user.orgId, req.user.userId, body.context);
  }

  // ─── Manager Endpoints ────────────────────────────────────────────────────

  @Post('team-insights-brief')
  @Roles('manager', 'admin', 'super_admin')
  async teamInsightsBrief(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.teamInsightsBrief(req.user.orgId, req.user.userId, body.context);
  }

  @Post('org-design-suggestions')
  @Roles('manager', 'admin', 'super_admin')
  async orgDesignSuggestions(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.orgDesignSuggestions(req.user.orgId, req.user.userId, body.context);
  }

  @Post('comp-equity-alerts')
  @Roles('manager', 'admin', 'super_admin')
  async compEquityAlerts(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.compEquityAlerts(req.user.orgId, req.user.userId, body.context);
  }

  @Post('succession-readiness')
  @Roles('manager', 'admin', 'super_admin')
  async successionReadiness(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.successionReadiness(req.user.orgId, req.user.userId, body.context);
  }

  // ─── Admin Endpoints ──────────────────────────────────────────────────────

  @Post('org-designer')
  @Roles('admin', 'super_admin')
  async orgDesigner(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.orgDesigner(req.user.orgId, req.user.userId, body.context);
  }

  @Post('smart-document-parser')
  @Roles('admin', 'super_admin')
  async smartDocumentParser(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.smartDocumentParser(req.user.orgId, req.user.userId, body.context);
  }

  @Post('payroll-anomaly-detection')
  @Roles('admin', 'super_admin')
  async payrollAnomalyDetection(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.payrollAnomalyDetection(req.user.orgId, req.user.userId, body.context);
  }

  @Post('predictive-compliance')
  @Roles('admin', 'super_admin')
  async predictiveCompliance(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.coreHrAiService.predictiveCompliance(req.user.orgId, req.user.userId, body.context);
  }
}
