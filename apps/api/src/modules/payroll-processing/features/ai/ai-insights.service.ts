import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class PayrollAiInsightsService {
  constructor(private readonly aiService: AiService) {}

  async anomalyDetection(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Detect payroll anomalies for this organization. Return JSON with: { anomalies: Array<{description: string, severity: string, amount?: number, employeeCount?: number}>, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async smartReconciliation(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Perform smart payroll reconciliation analysis. Return JSON with: { discrepancies: Array<{description: string, type: string, estimatedImpact: string}>, summary: string, recommendations: string[], autoResolvable: number, confidence: number }',
    );
    return { data: result };
  }

  async statutoryComplianceCheck(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze statutory compliance for payroll. Return JSON with: { complianceScore: number, issues: Array<{regulation: string, status: string, riskLevel: string, action: string}>, summary: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async salaryBenchmark(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze salary benchmarking against market data. Return JSON with: { insights: Array<string>, belowMarket: number, atMarket: number, aboveMarket: number, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async payrollAnomalyAlerts(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Detect unusual payroll amounts for this manager\'s team. Return JSON with: { anomalies: Array<{description: string, severity: string, employeeRef: string}>, summary: string, recommendations: string[], alertCount: number }',
    );
    return { data: result };
  }

  async taxOptimizer(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Generate tax optimization suggestions for an employee. Return JSON with: { suggestions: Array<{title: string, description: string, estimatedSaving: string, priority: string}>, summary: string, totalPotentialSaving: string, confidence: number }',
    );
    return { data: result };
  }
}
