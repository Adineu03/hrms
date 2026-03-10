import { Controller, Post, Body, Req } from '@nestjs/common';
import { ExpenseAiInsightsService } from './ai-insights.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { orgId: string; userId: string; role: string };
}

@Controller('expense-management/ai')
export class ExpenseAiInsightsController {
  constructor(private readonly aiInsightsService: ExpenseAiInsightsService) {}

  @Post('expense-intelligence')
  @Roles('admin', 'super_admin')
  async expenseIntelligence(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.expenseIntelligence(req.user.orgId, body.context);
  }

  @Post('policy-effectiveness')
  @Roles('admin', 'super_admin')
  async policyEffectiveness(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.policyEffectiveness(req.user.orgId, body.context);
  }

  @Post('anomaly-detection')
  @Roles('admin', 'super_admin')
  async anomalyDetection(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.anomalyDetection(req.user.orgId, body.context);
  }

  @Post('budget-forecasting')
  @Roles('admin', 'super_admin')
  async budgetForecasting(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.budgetForecasting(req.user.orgId, body.context);
  }

  @Post('expense-pattern-analysis')
  @Roles('manager', 'admin', 'super_admin')
  async expensePatternAnalysis(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.expensePatternAnalysis(req.user.orgId, req.user.userId, body.context);
  }

  @Post('fraud-risk-scoring')
  @Roles('manager', 'admin', 'super_admin')
  async fraudRiskScoring(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.fraudRiskScoring(req.user.orgId, req.user.userId, body.context);
  }

  @Post('smart-receipt-scanner')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async smartReceiptScanner(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.smartReceiptScanner(req.user.orgId, req.user.userId, body.context);
  }

  @Post('expense-categorization')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async expenseCategorization(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.expenseCategorization(req.user.orgId, req.user.userId, body.context);
  }

  @Post('policy-compliance-checker')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async policyComplianceChecker(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.policyComplianceChecker(req.user.orgId, req.user.userId, body.context);
  }
}
