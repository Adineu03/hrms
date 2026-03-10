import { Controller, Post, Body, Req } from '@nestjs/common';
import { PayrollAiInsightsService } from './ai-insights.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { orgId: string; userId: string; role: string };
}

@Controller('payroll-processing/ai')
export class PayrollAiInsightsController {
  constructor(private readonly aiInsightsService: PayrollAiInsightsService) {}

  @Post('anomaly-detection')
  @Roles('admin', 'super_admin')
  async anomalyDetection(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.anomalyDetection(req.user.orgId, body.context);
  }

  @Post('smart-reconciliation')
  @Roles('admin', 'super_admin')
  async smartReconciliation(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.smartReconciliation(req.user.orgId, body.context);
  }

  @Post('statutory-compliance-check')
  @Roles('admin', 'super_admin')
  async statutoryComplianceCheck(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.statutoryComplianceCheck(req.user.orgId, body.context);
  }

  @Post('salary-benchmark')
  @Roles('admin', 'super_admin')
  async salaryBenchmark(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.salaryBenchmark(req.user.orgId, body.context);
  }

  @Post('anomaly-alerts')
  @Roles('manager', 'admin', 'super_admin')
  async payrollAnomalyAlerts(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.payrollAnomalyAlerts(req.user.orgId, req.user.userId, body.context);
  }

  @Post('tax-optimizer')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async taxOptimizer(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.taxOptimizer(req.user.orgId, req.user.userId, body.context);
  }
}
