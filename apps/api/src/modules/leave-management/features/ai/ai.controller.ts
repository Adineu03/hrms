import { Controller, Post, Body, Request } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { LeaveAiService } from './ai.service';

@Controller('leave-management/ai')
export class LeaveAiController {
  constructor(private readonly leaveAiService: LeaveAiService) {}

  // ─── Employee Endpoints ───────────────────────────────────────────────────

  @Post('smart-leave-planner')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async smartLeavePlanner(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.smartLeavePlanner(req.user.orgId, req.user.userId, body.context);
  }

  @Post('balance-forecast')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async balanceForecast(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.balanceForecast(req.user.orgId, req.user.userId, body.context);
  }

  @Post('conversational-apply')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async conversationalApply(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.conversationalApply(req.user.orgId, req.user.userId, body.context);
  }

  @Post('wellness-nudge')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async wellnessNudge(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.wellnessNudge(req.user.orgId, req.user.userId, body.context);
  }

  // ─── Manager Endpoints ────────────────────────────────────────────────────

  @Post('coverage-risk-analyzer')
  @Roles('manager', 'admin', 'super_admin')
  async coverageRiskAnalyzer(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.coverageRiskAnalyzer(req.user.orgId, req.user.userId, body.context);
  }

  @Post('pattern-alerting')
  @Roles('manager', 'admin', 'super_admin')
  async patternAlerting(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.patternAlerting(req.user.orgId, req.user.userId, body.context);
  }

  @Post('approval-copilot')
  @Roles('manager', 'admin', 'super_admin')
  async approvalCopilot(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.approvalCopilot(req.user.orgId, req.user.userId, body.context);
  }

  @Post('quarterly-planning-brief')
  @Roles('manager', 'admin', 'super_admin')
  async quarterlyPlanningBrief(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.quarterlyPlanningBrief(req.user.orgId, req.user.userId, body.context);
  }

  // ─── Admin Endpoints ──────────────────────────────────────────────────────

  @Post('policy-benchmarking')
  @Roles('admin', 'super_admin')
  async policyBenchmarking(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.policyBenchmarking(req.user.orgId, req.user.userId, body.context);
  }

  @Post('abuse-detection')
  @Roles('admin', 'super_admin')
  async abuseDetection(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.abuseDetection(req.user.orgId, req.user.userId, body.context);
  }

  @Post('liability-forecast')
  @Roles('admin', 'super_admin')
  async liabilityForecast(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.liabilityForecast(req.user.orgId, req.user.userId, body.context);
  }

  @Post('regulatory-auto-update')
  @Roles('admin', 'super_admin')
  async regulatoryAutoUpdate(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.leaveAiService.regulatoryAutoUpdate(req.user.orgId, req.user.userId, body.context);
  }
}
