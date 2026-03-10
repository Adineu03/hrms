import { Controller, Post, Body, Request } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { AttendanceAiService } from './ai.service';

@Controller('attendance/ai')
export class AttendanceAiController {
  constructor(private readonly attendanceAiService: AttendanceAiService) {}

  // ─── Employee Endpoints ───────────────────────────────────────────────────

  @Post('smart-punch-reminder')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async smartPunchReminder(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.smartPunchReminder(req.user.orgId, req.user.userId, body.context);
  }

  @Post('commute-aware-clock-in')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async commuteAwareClockIn(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.commuteAwareClockIn(req.user.orgId, req.user.userId, body.context);
  }

  @Post('work-pattern-insights')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async workPatternInsights(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.workPatternInsights(req.user.orgId, req.user.userId, body.context);
  }

  @Post('anomaly-self-alert')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async anomalySelfAlert(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.anomalySelfAlert(req.user.orgId, req.user.userId, body.context);
  }

  // ─── Manager Endpoints ────────────────────────────────────────────────────

  @Post('absenteeism-predictor')
  @Roles('manager', 'admin', 'super_admin')
  async absenteeismPredictor(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.absenteeismPredictor(req.user.orgId, req.user.userId, body.context);
  }

  @Post('smart-shift-optimizer')
  @Roles('manager', 'admin', 'super_admin')
  async smartShiftOptimizer(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.smartShiftOptimizer(req.user.orgId, req.user.userId, body.context);
  }

  @Post('team-health-pulse')
  @Roles('manager', 'admin', 'super_admin')
  async teamHealthPulse(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.teamHealthPulse(req.user.orgId, req.user.userId, body.context);
  }

  @Post('auto-exception-resolution')
  @Roles('manager', 'admin', 'super_admin')
  async autoExceptionResolution(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.autoExceptionResolution(req.user.orgId, req.user.userId, body.context);
  }

  // ─── Admin Endpoints ──────────────────────────────────────────────────────

  @Post('policy-impact-simulator')
  @Roles('admin', 'super_admin')
  async policyImpactSimulator(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.policyImpactSimulator(req.user.orgId, req.user.userId, body.context);
  }

  @Post('compliance-auto-monitor')
  @Roles('admin', 'super_admin')
  async complianceAutoMonitor(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.complianceAutoMonitor(req.user.orgId, req.user.userId, body.context);
  }

  @Post('fraud-detection')
  @Roles('admin', 'super_admin')
  async fraudDetection(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.fraudDetection(req.user.orgId, req.user.userId, body.context);
  }

  @Post('smart-payroll-reconciliation')
  @Roles('admin', 'super_admin')
  async smartPayrollReconciliation(
    @Request() req: any,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.attendanceAiService.smartPayrollReconciliation(req.user.orgId, req.user.userId, body.context);
  }
}
